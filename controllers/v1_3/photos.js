'use strict';

var fs = require('fs');
var path = require('path');

var mongoose = require('mongoose');
var PhotoAlbum = mongoose.model('PhotoAlbum');
var Photo = mongoose.model('Photo');

var log = require('../../services/error_log.js');
var auth = require('../../services/auth.js');
var donlerValidator = require('../../services/donler_validator.js');
var userScore = require('../../services/user_score.js');
var uploader = require('../../services/uploader.js');
var tools = require('../../tools/tools.js');

module.exports = {

    getPhotoAlbumById: function (req, res, next) {
      PhotoAlbum.findOne({
        _id: req.params.photoAlbumId,
        hidden: false
      }).exec()
        .then(function (photoAlbum) {
          if (!photoAlbum) {
            res.sendStatus(404);
          } else {
            req.photoAlbum = photoAlbum;
            next();
          }
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    createPhotoAlbumValidate: function (req, res, next) {
      donlerValidator({
        cid: {
          name: '相册所属的公司id',
          value: req.body.cid,
          validators: ['required']
        },
        tid: {
          name: '相册所属小队的id',
          value: req.body.tid,
          validators: ['required']
        },
        name: {
          name: '相册名字',
          value: req.body.name,
          validators: ['required', donlerValidator.maxLength(30)]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    createPhotoAlbum: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.body.cid],
        teams: [req.body.tid]
      });
      var allow = auth.auth(role, ['createPhotoAlbum']);
      if (!allow.createPhotoAlbum) {
        res.sendStatus(403);
        return;
      }

      var photoAlbum = PhotoAlbum.New(req.body.name, {
        model: {
          _id: req.body.tid,
          type: 'CompanyGroup'
        },
        companies: [req.body.cid],
        teams: [req.body.tid]
      }, req.user);



      photoAlbum.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      });

    },

    getPhotoAlbumsValidate: function (req, res, next) {
      donlerValidator({
        ownerType: {
          name: 'ownerType',
          value: req.query.ownerType,
          validators: ['required', donlerValidator.enum('team')]
        },
        ownerId: {
          name: 'ownerId',
          value: req.query.ownerId,
          validators: ['required']
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      })
    },

    getPhotoAlbums: function (req, res) {
      // 因为暂时req.query.ownerType只可能会是team，所以默认为team，直接查找小队相册

      var query = {
        'owner.teams': req.query.ownerId,
        'hidden': false,
        '$nor': [
          { 'owner.model': 'Campaign' },
          { 'photo_count': 0 }
        ]
      };
      if (req.query.createDate) {
        query.create_date = { '$lt': new Date(req.query.createDate) };
      }

      PhotoAlbum.find(query, {
        _id: true,
        name: true,
        owner: true,
        update_date: true,
        update_user: true,
        photo_count: true,
        create_date: true,
        photos: true
      })
        .sort('-create_date')
        .limit(20)
        .exec()
        .then(function (photoAlbums) {

          // 获取对应的公司id
          var cid;
          if (req.query.ownerType === 'team') {
            for (var i = 0; i < photoAlbums[0].owner.teams.length; i++) {
              var team = photoAlbums[0].owner.teams[i];
              if (req.query.ownerId === team.toString()) {
                cid = photoAlbums[0].owner.companies[i];
                break;
              }
            }
          }

          var role = auth.getRole(req.user, {
            companies: [cid]
          });
          var allow = auth.auth(role, ['getTeamPhotoAlbums']);
          if (!allow.getTeamPhotoAlbums) {
            res.status(403).send({ msg: '权限不足' });
            return;
          }

          var resPhotoAlbums = [];
          photoAlbums.forEach(function (photoAlbum) {
            var latestPhotos = tools.collect(photoAlbum.photos, '_id', 'uri');
            resPhotoAlbums.push({
              _id: photoAlbum._id,
              name: photoAlbum.name,
              createDate: photoAlbum.create_date,
              updateDate: photoAlbum.update_date,
              updateUser: photoAlbum.update_user,
              photoCount: photoAlbum.photo_count,
              latestPhotos: latestPhotos.slice(0, 8)
            });
          });
          res.status(200).send(resPhotoAlbums);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    getPhotoAlbum: function (req, res) {
      var photoAlbum = req.photoAlbum;

      var role = auth.getRole(req.user, {
        companies: photoAlbum.owner.companies
      });
      var allow = auth.auth(role, ['getPhotoAlbum']);
      if (!allow.getPhotoAlbum) {
        res.status(403).send({ msg: '权限不足' });
        return;
      }

      var resPhotoAlbum = {
        _id: photoAlbum._id,
        owner: photoAlbum.owner,
        name: photoAlbum.name,
        updateDate: photoAlbum.update_date,
        updateUser: photoAlbum.update_user,
        photoCount: photoAlbum.photo_count
      };
      res.status(200).send(resPhotoAlbum);
    },

    editPhotoAlbumValidate: function (req, res, next) {
      donlerValidator({
        name: {
          name: '相册名',
          value: req.body.name,
          validators: ['required', donlerValidator.maxLength(30)]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    editPhotoAlbum: function (req, res) {
      var photoAlbum = req.photoAlbum;

      var role = auth.getRole(req.user, {
        companies: photoAlbum.owner.companies,
        teams: photoAlbum.owner.teams
      });
      var allow = auth.auth(role, ['editPhotoAlbum']);
      if (!allow.editPhotoAlbum) {
        res.sendStatus(403);
        return;
      }

      photoAlbum.name = req.body.name;
      photoAlbum.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      });
    },

    deletePhotoAlbum: function (req, res) {
      var photoAlbum = req.photoAlbum;

      var role = auth.getRole(req.user, {
        companies: photoAlbum.owner.companies,
        teams: photoAlbum.owner.teams
      });
      var allow = auth.auth(role, ['deletePhotoAlbum']);
      if (!allow.deletePhotoAlbum) {
        res.status(403).send({ msg: '权限不足' });
        return;
      }

      if (photoAlbum.owner.model.type === 'Campaign') {
        res.status(403).send({ msg: '活动相册不允许删除' });
        return;
      }

      photoAlbum.hidden = true;
      photoAlbum.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(204);
        }
      });

    },

    uploadPhoto: function (req, res) {
      var photoAlbum = req.photoAlbum;

      var role = auth.getRole(req.user, {
        companies: photoAlbum.owner.companies,
        teams: photoAlbum.owner.teams
      });
      var allow = auth.auth(role, ['uploadPhoto']);
      if (!allow.uploadPhoto) {
        res.sendStatus(403);
        return;
      }
      var imgSize;
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/photo_album',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
        getSize: function (size) {
          imgSize = size;
        },
        success: function (url, oriName, oriCallback) {
          var uploadUser;
          if (req.user.provider === 'user') {
            uploadUser = {
              _id: req.user._id,
              name: req.user.nickname,
              type: 'user'
            };

            // todo 判断是否是官方小队
            // 添加积分
            userScore.addScore(req.user, {
              uploadPhotoToOfficialTeam: 1
            }, function (err) {
              if (err) {
                log(err);
              }
            });

          } else if (req.user.provider === 'company') {
            uploadUser = {
              _id: req.user._id,
              name: req.user.info.name,
              type: 'hr'
            }
          }

          // 设置准确的owner，相册可以属于多个公司多个小队，但照片只能属于一个公司一个小队
          // 以前owner中companies和teams都是数组，为了不破坏其它功能，不改动数据结构
          var owner = {};
          if (req.user.provider === 'user') {
            for (var i = 0; i < photoAlbum.owner.companies.length; i++) {
              if (req.user.cid.toString() === photoAlbum.owner.companies[i].toString()) {
                owner.companies = [photoAlbum.owner.companies[i]];
                break;
              }
            }

            if (photoAlbum.owner.teams) {
              for (var i = 0; i < photoAlbum.owner.teams.length; i++) {
                if (req.user.isTeamMember(photoAlbum.owner.teams[i])) {
                  owner.teams = [photoAlbum.owner.teams[i]];
                  break;
                }
              }
            }

          } else {
            for (var i = 0; i < photoAlbum.owner.companies.length; i++) {
              if (req.user.id === photoAlbum.owner.companies[i].toString()) {
                owner.companies = [photoAlbum.owner.companies[i]];
                break;
              }
            }
          }

          var photo = new Photo({
            photo_album: photoAlbum._id,
            owner: owner,
            uri: path.join('/img/photo_album', url),
            width: imgSize.width,
            height: imgSize.height,
            name: oriName,
            upload_user: uploadUser
          });
          photo.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              var now = new Date();
              var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
              oriCallback(path.join('/ori_img', dateDirName), photo._id, function (err) {
                if (err) {
                  log(err);
                }
              });
              res.sendStatus(201);

              // 照片保存成功后，意味着上传已经成功了，之后的更新相册数据的操作无论成功与否，都视为上传照片成功
              photoAlbum.pushPhoto({
                _id: photo._id,
                uri: photo.uri,
                upload_date: photo.upload_date,
                click: photo.click,
                name: photo.name,
                width: photo.width,
                height: photo.height,
                upload_user: {
                  _id: photo.upload_user,
                  name: photo.name,
                  type: photo.type
                }
              });
              photoAlbum.update_user = uploadUser;
              photoAlbum.update_date = Date.now();
              photoAlbum.photo_count += 1;
              photoAlbum.save(function (err) {
                if (err) {
                  log(err);
                }
              });
            }
          });
        },
        error: function (err) {
          log(err);
          res.status(500).send({ msg: '服务器错误' });
        }
      });

    },

    getPhotos: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: req.photoAlbum.owner.companies
      });
      var allow = auth.auth(role, ['getPhotos']);
      if (!allow.getPhotos) {
        res.status(403).send({ msg: '权限不足' });
        return;
      }

      Photo.find({
        'photo_album': req.params.photoAlbumId,
        'hidden': false
      }, {
        '_id': true,
        'uri': true,
        'width': true,
        'height': true,
        'name': true,
        'upload_user': true,
        'upload_date': true
      })
        .sort('-upload_date')
        .exec()
        .then(function (photos) {

          var resPhotos = [];
          photos.forEach(function (photo) {
            resPhotos.push({
              _id: photo._id,
              uri: photo.uri,
              width: photo.width,
              height: photo.height,
              name: photo.name,
              uploadUser: photo.upload_user,
              uploadDate: photo.upload_date
            });
          });
          res.status(200).send(resPhotos);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    getPhoto: function (req, res) {
      Photo
        .findOne({
          _id: req.params.photoId,
          hidden: false
        }, {
          '_id': true,
          'uri': true,
          'name': true,
          'owner': true,
          'upload_user': true,
          'upload_date': true
        })
        .exec()
        .then(function (photo) {
          if (!photo) {
            res.sendStatus(404);
            return;
          }

          var role = auth.getRole(req.user, {
            companies: photo.owner.companies
          });
          var allow = auth.auth(role, ['getPhoto']);
          if (!allow.getPhoto) {
            res.status(403).send({ msg: '权限不足' });
            return;
          }

          var resPhoto = {
            _id: photo._id,
            uri: photo.uri,
            name: photo.name,
            uploadUser: photo.upload_user,
            uploadDate: photo.upload_date
          };
          res.status(200).send(resPhoto);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });

    },


    editPhotoValidate: function (req, res, next) {
      donlerValidator({
        name: {
          name: '照片名称',
          value: req.body.name,
          validators: ['required', donlerValidator.maxLength(30)]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    editPhoto: function (req, res) {
      Photo.findOne({
        _id: req.params.photoId,
        hidden: false
      }).exec()
        .then(function (photo) {
          if (!photo) {
            res.sendStatus(404);
            return;
          }

          var role = auth.getRole(req.user, {
            companies: photo.owner.companies,
            teams: photo.owner.teams,
            users: [photo.upload_user._id]
          });
          var allow = auth.auth(role, ['editPhoto']);
          if (!allow.editPhoto) {
            res.sendStatus(403);
            return;
          }

          photo.name = req.body.name;
          photo.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.sendStatus(200);
            }
          });
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });

    },

    deletePhoto: function (req, res) {
      var photoAlbum = req.photoAlbum;

      Photo.findOne({
        _id: req.params.photoId,
        hidden: false
      }).exec()
        .then(function (photo) {
          if (!photo) {
            res.sendStatus(404);
            return;
          }

          var role = auth.getRole(req.user, {
            companies: photo.owner.companies,
            teams: photo.owner.teams,
            users: [photo.upload_user._id]
          });
          var allow = auth.auth(role, ['deletePhoto']);
          if (!allow.deletePhoto) {
            res.sendStatus(403);
            return;
          }

          photo.hidden = true;
          photo.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.sendStatus(200);
            }
          });

          try {
            // 后续的照片文件相关操作及更新相册照片计数
            var yaliDir = uploader.yaliDir;

            var result = photo.uri.match(/^([\s\S]+)\/(([-\w]+)\.[\w]+)$/);
            var imgPath = result[1], imgFilename = result[2], imgName = result[3];

            var oriPath = path.join(yaliDir, 'public', imgPath);
            var sizePath = path.join(oriPath, 'size');

            var removeSizeFiles = fs.readdirSync(sizePath).filter(function (item) {
              if (item.indexOf(imgName) === -1) {
                return false;
              } else {
                return true;
              }
            });

            removeSizeFiles.forEach(function (filename) {
              fs.unlinkSync(path.join(sizePath, filename));
            });

            var now = new Date();
            var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
            var moveTargetDir = path.join(yaliDir, 'img_trash', dateDirName);
            if (!fs.existsSync(moveTargetDir)) {
              mkdirp.sync(moveTargetDir);
            }
            // 将上传的图片移至备份目录
            fs.renameSync(path.join(yaliDir, 'public', photo.uri), path.join(moveTargetDir, imgFilename));

            if (tools.arrayObjectIndexOf(photoAlbum.photos, photo._id, '_id') !== -1) {
              photoAlbum.reliable = false;
            }
            photoAlbum.photo_count--;
            photoAlbum.save(function(err) {
              // 即使更新相册照片数量失败了，依然算作是删除成功。
              console.log(err);
            });
          } catch (e) {
            log(e);
          }

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });

    }
};