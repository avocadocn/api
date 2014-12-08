'use strict';

var path = require('path');

var mongoose = require('mongoose');
var PhotoAlbum = mongoose.model('PhotoAlbum');

var log = require('../services/error_log.js');
var auth = require('../services/auth.js');
var donlerValidator = require('../services/donler_validator.js');
var uploader = require('../services/uploader.js');

module.exports = function (app) {
  return {

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
      PhotoAlbum.find({
        teams: req.query.tid,
        hidden: false
      }, {
        _id: 1,
        name: 1,
        update_date: 1,
        update_user: 1,
        photo_count: 1
      }).exec()
        .then(function (photoAlbums) {
          var resPhotoAlbums = [];
          photoAlbums.forEach(function (photoAlbum) {
            resPhotoAlbums.push({
              _id: photoAlbum._id,
              name: photoAlbum.name,
              updateDate: photoAlbum.update_date,
              updateUser: photoAlbum.update_user,
              photoCount: photoAlbum.photo_count
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
      var resPhotoAlbum = {
        _id: photoAlbum._id,
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
        res.sendStatus(403);
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

    // todo 待测试
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

      // todo upload photo 待测试
      uploader(req, {
        fieldName: 'photo',
        targetDir: '/public/photo_album',
        saveOrigin: true,
        success: function (url, oriName, oriCallback) {
          var uploadUser;
          if (req.user.provider === 'user') {
            uploadUser = {
              _id: req.user._id,
              name: req.user.nickname,
              type: 'user'
            };
          } else if (req.user.provider === 'company') {
            uploadUser = {
              _id: req.user._id,
              name: req.user.info.name,
              type: 'hr'
            }
          }
          var photo = {
            uri: path.join('/photo_album', url),
            name: oriName,
            upload_user: uploadUser
          };
          photoAlbum.photos.push(photo);
          photoAlbum.update_user = uploadUser;
          photoAlbum.update_date = Date.now();
          photoAlbum.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              var date_dir_name = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
              oriCallback(path.join('/ori_img', date_dir_name), photo._id, function (err) {
                if (err) {
                  log(err);
                }
              });
              res.sendStatus(201);
            }
          });

        },
        error: function (err) {
          log(err);
          res.sendStatus(500);
        }
      });

    },

    getPhotos: function (req, res) {
      var photoAlbum = req.photoAlbum;
      var photos = photoAlbum.getPhotos();
      var resPhotos = [];
      photos.forEach(function (photo) {
        resPhotos.push({
          _id: photo._id,
          url: photo.uri,
          name: photo.name
        });
      });
      res.status(200).send(resPhotos);
    },

    getPhoto: function (req, res) {
      var photoAlbum = req.photoAlbum;

      var photo = photoAlbum.getPhoto(req.params.photoId);
      if (!photo) {
        res.sendStatus(404);
        return;
      }

      var resPhoto = {
        _id: photo._id,
        url: photo.uri,
        name: photo.name,
        uploadUser: photo.upload_user,
        uploadDate: photo.upload_date
      };
      res.status(200).send(resPhoto);

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
      var photoAlbum = req.photoAlbum;

      var photo = photoAlbum.getPhoto(req.params.photoId);
      if (!photo) {
        res.sendStatus(404);
        return;
      }

      var role = auth.getRole(req.user, {
        companies: photoAlbum.owner.companies,
        teams: photoAlbum.owner.teams,
        users: [photo.upload_user._id]
      });
      var allow = auth.auth(role, ['editPhoto']);
      if (!allow.editPhoto) {
        res.sendStatus(403);
        return;
      }

      photo.name = req.body.name;
      photoAlbum.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      });

    },

    deletePhoto: function (req, res) {
      var photoAlbum = req.photoAlbum;

      var photo = photoAlbum.getPhoto(req.params.photoId);
      if (!photo) {
        res.sendStatus(404);
        return;
      }

      var role = auth.getRole(req.user, {
        companies: photoAlbum.owner.companies,
        teams: photoAlbum.owner.teams,
        users: [photo.upload_user._id]
      });
      var allow = auth.auth(role, ['deletePhoto']);
      if (!allow.deletePhoto) {
        res.sendStatus(403);
        return;
      }

      photo.hidden = true;
      photoAlbum.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      });
    }

  };
};