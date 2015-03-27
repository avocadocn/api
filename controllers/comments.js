'use strict';

var path = require('path'),
    fs = require('fs');
var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    Comment = mongoose.model('Comment'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    Photo = mongoose.model('Photo'),
    User = mongoose.model('User'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    CompetitionMessage = mongoose.model('CompetitionMessage');
var async = require('async'),
    xss = require('xss');
var auth = require('../services/auth.js'),
    log = require('../services/error_log.js'),
    socketClient = require('../services/socketClient'),
    uploader = require('../services/uploader.js'),
    tools = require('../tools/tools.js'),
    donlerValidator = require('../services/donler_validator.js');
var shieldTip = "该评论已经被系统屏蔽";
/**
 * 为comments的每个comment设置权限
 * @param {Object} data 用户和评论的相关数据
 * data: {
 *     host_type: String, // 留言或评论目标对象类型, campaign or photo
 *     host_id: String, // 目标对象id
 *     user: Object, // req.user
 *     comments: Array // 数组元素类型为mongoose.model('Comment')
 * }
 * @param {Function} callback 设置结束的回调, callback(err)
 */
var setDeleteAuth = function setDeleteAuth(data, callback) {
  var user = data.user;
  var _auth = function (callback) {
    for (var i = 0; i < data.comments.length; i++) {
      var comment = data.comments[i];
      var can_delete = false;

      if (user.provider === 'company') {
        if (comment.poster.cid.toString() === user._id.toString()) {
          can_delete = true;
        }
      } else if (user.provider === 'user') {
        if (comment.poster._id.toString() === user._id.toString()) {
          can_delete = true;
        }
        // 其它情况，如user是队长
        if (callback) {
          can_delete = !!callback(comment);
        }
      }
      comment.set('delete_permission', can_delete, {strict: false});
      comment.delete_permission = can_delete;
      if (comment.status === 'shield') {
        comment.set('content', shieldTip, {strict: false});
      }
    }
  };

  switch (data.host_type) {
    case 'campaign_detail':
    // waterfall
    case 'campaign':
      // 评论目标是活动
      Campaign.findById(data.host_id).exec()
        .then(function (campaign) {
          var is_leader = false;
          if (campaign.tid && user.provider === 'user') {
            for (var i = 0; i < campaign.tid.length; i++) {
              if (user.isTeamLeader(campaign.tid[i].toString())) {
                is_leader = true;
                break;
              }
            }
          }
          if (is_leader) {
            _auth(function (comment) {
              // 是leader可以删除活动中自己公司成员发的评论
              if (comment.poster.cid.toString() === user.cid.toString()) {
                return true;
              } else {
                return false;
              }
            });
            callback && callback();
          } else {
            _auth();
            callback && callback();
          }
        })
        .then(null, function (err) {
          _auth();
          log(err);
          callback(err);
        });
      break;
    case 'photo':
      // todo: 评论目标是照片
      _auth();
      callback();
      break;
    case 'comment':
      Comment.findById(data.host_id).exec()
        .then(function (comment) {
          if (!comment) {
            return callback('not found');
          }
          setDeleteAuth({
            host_type: comment.host_type,
            host_id: comment.host_id,
            user: user,
            comments: data.comments
          }, callback);
        })
        .then(null, function (err) {
          log(err);
          callback(err);
        });
      break;
    default:
      _auth();
      callback();
      break;
  }
};

module.exports = function (app) {

  return {

    canPublishComment: function (req, res, next) {
      var hostId = req.params.hostId;
      var hostType = req.params.hostType;
      switch (hostType) {
        case 'campaign':
          Campaign.findById(hostId).exec()
            .then(function (campaign) {
              if (!campaign) {
                return res.status(400).send({ msg: '无此活动' });
              }
              var role = auth.getRole(req.user, {
                companies: campaign.cid,
                teams: campaign.tid
              });
              var allow = auth.auth(role, ['publishComment']);
              if (!allow.publishComment) {
                return res.status(403).send({ msg: '权限错误' });
              }
              req.campaign = campaign;
              req.photoAlbumId = campaign.photo_album;
              next();
            })
            .then(null, function (err) {
              log(err);
              res.sendStatus(500);
            });
          break;
        case 'competition_message':
          CompetitionMessage.findById(hostId)
          .populate('sponsor_team opposite_team')
          .exec()
            .then(function (competitionMessage) {
              if (!competitionMessage) {
                return res.status(400).send({ msg: '无此挑战信' });
              }
              var role = auth.getRole(req.user, {
                companies: [competitionMessage.sponsor_cid, competitionMessage.opposite_cid],
                teams: [competitionMessage.sponsor_team, competitionMessage.opposite_team]
              });
              var allow = auth.auth(role, ['publishComment']);
              if (!allow.publishComment) {
                return res.status(403).send({ msg: '权限错误' });
              }
              req.competitionMessage = competitionMessage;
              next();
            })
            .then(null, function (err) {
              log(err);
              res.sendStatus(500);
            });
          break;
        default:
          return res.status(403).send({ msg: '权限错误' });
      }

    },

    getCampaignPhotoAlbum: function (req, res, next) {
      // 如果不传照片就直接进入下一中间件
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }
      if (req.photoAlbumId) {
        PhotoAlbum.findById(req.photoAlbumId).exec()
          .then(function (photoAlbum) {
            if (!photoAlbum) {
              res.sendStatus(500);
              return;
            }
            req.photoAlbum = photoAlbum;
            next();
          })
          .then(null, function (err) {
            log(err);
            res.sendStatus(500);
          });
      } else {
        next();
      }
    },

    uploadPhotoForComment: function (req, res, next) {
      if (!req.photoAlbum) {
        // 不传照片的话直接到下一步
        next();
        return;
      }

      var photoAlbum = req.photoAlbum;

      var imgSize;
      var randomId;
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/photo_album',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
        getFields: function (fields) {
          if(fields.randomId) {
            randomId = fields.randomId[0];
            req.randomId = randomId;
          }
        },
        getSize: function (size) {
          imgSize = size;
        },
        success: function (url, oriName, oriCallback) {
          // 此处不再判断，只有user可以上传，禁止hr上传
          var uploadUser = {
            _id: req.user._id,
            name: req.user.nickname,
            type: 'user'
          };

          var photo = new Photo({
            photo_album: photoAlbum._id,
            owner: {
              companies: photoAlbum.owner.companies,
              teams: photoAlbum.owner.teams
            },
            uri: path.join('/img/photo_album', url),
            width: imgSize.width,
            height: imgSize.height,
            name: oriName,
            upload_user: uploadUser
          });
          req.photo = photo;
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
              next();

              // 照片保存成功后，意味着上传已经成功了，之后的更新相册数据的操作无论成功与否，都视为上传照片成功
              photoAlbum.pushPhoto({
                _id: photo._id,
                uri: photo.uri,
                width: photo.width,
                height: photo.height,
                upload_date: photo.upload_date,
                click: photo.click,
                name: photo.name,
                upload_user: photo.upload_user
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
          res.sendStatus(500);
        }
      });

    },

    createComments: function (req, res) {
      var host_id = req.params.hostId;  //留言主体的id,这个主体可以是 一条活动、一张照片、一场比赛等等
      var host_type = req.params.hostType;
      var comment = new Comment();
      var poster = {
        '_id': req.user._id,
        'cid': req.user.cid,
        'cname': req.user.cname,
        'nickname': req.user.nickname,
        'realname': req.user.realname,
        'photo': req.user.photo
      };
      comment.host_type = host_type;
      comment.host_id = host_id;
      comment.poster = poster;
      comment.create_date = Date.now();
      if (req.photo) {
        comment.photos = [{
          _id: req.photo._id,
          uri: req.photo.uri,
          width: req.photo.width,
          height: req.photo.height,
          upload_user: {
            _id: req.photo.upload_user._id,
            name: req.photo.upload_user.name,
            type: req.photo.upload_user.type
          }
        }];
      }
      if (req.body && req.body.content) {
        var content = xss(req.body.content);
        comment.content = content;
      }
      comment.save(function (err) {
        if (err) {
          //'COMMENT_PUSH_ERROR'
          log(err);
          return res.status(500).send({msg: "COMMENT_PUSH_ERROR'"});
        } else {
          res.status(200).send({'comment': comment});

          if (req.campaign) {
            var campaign = req.campaign;
            campaign.comment_sum++;
            
            campaign.save(function (err) {
              if (err) {
                log(err);
              }
            });
            
          }
          if (req.competitionMessage) {
            //更新挑战信未读状态
            
            //socket
            //发给另一个队长
            //先看自己是不是第一个队的队长，如果不是，那肯定是第二个队的= -...
            var sponsor_team = req.competitionMessage.sponsor_team;
            var opposite_team = req.competitionMessage.opposite_team;
            if(req.user.isTeamLeader(sponsor_team._id)) {
              req.competitionMessage.opposite_unread =true;
              opposite_team.leader.forEach(function(leader, index){
                socketClient.pushMessage(leader._id);
              });
            }else {
              req.competitionMessage.sponsor_unread =true;
              sponsor_team.leader.forEach(function(leader, index){
                socketClient.pushMessage(leader._id);
              });
            }
            req.competitionMessage.save(function (err) {
              if (err) {
                log(err);
              }
            });
          }
        }
      });
    },


    getComments: function(req, res) {
      donlerValidator({
        requestType: {
          name: '主体类型',
          value: req.query.requestType,
          validators: ['required']
        },
        requestId: {
          name: '主体ID',
          value: req.query.requestId,
          validators: ['required']
        },
        limit: {
          name: '数量限制',
          value: req.query.limit,
          validators: ['number']
        }
      }, 'complete', function (pass, msg) {
        if(pass) {
          var model = '';
          switch(req.query.requestType) {
            case 'campaign':
              model ='Campaign';
              break;
            case 'competition_message':
              model='CompetitionMessage';
              break;
            default:
              return res.status(400).send({msg:'无法获取该类型的评论'});
          }
          mongoose.model(model).findOne({_id: req.query.requestId}, function(err, model) {
            if(err || !model) return res.status(500).send({msg:'无对应的主体'});
            else {
              var requestCid;
              switch(req.query.requestType) {
                case 'campaign':
                  requestCid =model.cid;
                  break;
                case 'competition_message':
                  requestCid =[model.sponsor_cid.toString(), model.opposite_cid.toString()];
                  break;
              }
              if(req.user.provider === 'company' && requestCid.indexOf(req.user._id) === -1 || req.user.provider === 'user' && requestCid.indexOf(req.user.cid.toString())=== -1) {
                return res.status(403).send({msg:'权限错误'});
              }
              else {
                //获取评论，只有comment 无reply
                Comment.getComments({
                  hostType: req.query.requestType,
                  hostId: req.query.requestId
                }, req.query.createDate, req.query.limit, function (err, comments, nextStartDate) {

                  setDeleteAuth({
                    host_type: req.query.requestType,
                    host_id: req.query.requestId,
                    user: req.user,
                    comments: comments
                  }, function (err) {
                    if (err) console.log(err);
                    // 即使错误依然会做基本的权限设置（公司可删自己员工的，自己可以删自己的），所以依旧返回数据
                    res.status(200).send({'comments': comments, nextStartDate: nextStartDate});
                    // userReadComment(req.user, req.query.requestId, function(){});
                  });
                });
              }
            }
          })
        }
        else {
          var resMsg = donlerValidator.combineMsg(msg);
          return res.status(422).send({ msg: resMsg });
        }
      })

    },

    deleteComment: function(req, res) {

      var deleteCommentPhotos = function (photoIds, callback) {
        Photo.find({
          _id: { $in: photoIds },
          hidden: false
        }).exec()
          .then(function (photos) {
            async.map(photos, function (photo, itemCallback) {
              var result = photo.uri.match(/^([\s\S]+)\/(([-\w]+)\.[\w]+)$/);
              var imgPath = result[1], imgFilename = result[2], imgName = result[3];

              var oriPath = path.join(uploader.yaliDir, 'public', imgPath);
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
              var moveTargeDir = path.join(uploader.yaliDir, 'img_trash', dateDirName);
              if (!fs.existsSync(moveTargeDir)) {
                mkdirp.sync(moveTargeDir);
              }
              // 将上传的图片移至备份目录
              fs.renameSync(path.join(uploader.yaliDir, 'public', photo.uri), path.join(moveTargeDir, imgFilename));

              photo.hidden = true;
              photo.save(itemCallback);
            }, function (err) {
              callback(err);
              // 只要更新了照片，就认为是已经删除成功了，不需要判断相册的照片计数是否也更新成功。
              PhotoAlbum.findOne({
                'photos._id': photoIds[0]
              }).exec()
                .then(function (photoAlbum) {
                  photoAlbum.photo_count -= photoIds.length;
                  photoAlbum.reliable = false;
                  photoAlbum.save(function (err) {
                    if (err) {
                      console.log(err);
                    }
                  });
                })
                .then(null, function (err) {
                  console.log(err);
                });

            });
          })
          .then(null, function (err) {
            callback(err);
          });
      };

      var comment = req.comment;
      setDeleteAuth({
        host_type: comment.host_type,
        host_id: comment.host_id,
        user: req.user,
        comments: [comment]
      }, function (err) {
        if (err) {
          console.log(err);
        }
        if (comment.delete_permission) {
          comment.status = 'delete';
          comment.save(function (err) {
            if (err) {
              log(err);
              return res.status(500).send({msg: 'comment save error'});
            }
            // save成功就意味着已经改为delete状态，后续操作不影响已经成功这个事实，故直接返回成功状态
            res.status(200).send({ msg: 'success' });

            // 计数-1
            if (comment.host_type === "campaign" || comment.host_type === "campaign_detail") {
              Campaign.findByIdAndUpdate(comment.host_id, {
                '$inc': {
                  'comment_sum': -1
                }
              }, function (err, message) {
                if (err) {
                  log(err);
                }
              });
            }
            // 同时在相册移除相应的照片
            if (comment.photos && comment.photos.length > 0) {
              var photoIds = [];
              comment.photos.forEach(function (photo) {
                photoIds.push(photo._id);
              });
              deleteCommentPhotos(photoIds, function (err) {
                if (err) {
                  log(err);
                }
              });
            }
            // 如果comment的目标类型是comment，将comment的计数-1
            if (comment.host_type === 'comment') {
              Comment.findByIdAndUpdate(comment.host_id, {
                '$inc': {
                  'reply_count': -1
                }
              }, function (err) {
                if (err) {
                  log(err);
                }
              });
            }
          });
        } else {
          return res.status(403).send({msg: 'forbidden'});
        }
      });
    },
    getCommentById: function(req, res, next) {
      Comment.findById(req.params.commentId).exec()
      .then(function (comment) {
        if (!comment) {
          return res.status(404).send({msg: '未找到评论'});
        } else {
          req.comment = comment;
          next();
        }
      })
      .then(null, function (err) {
        return res.status(500).send({msg: 'Comment not found'});
      });
    }
  };
};