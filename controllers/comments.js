'use strict';

var path = require('path'),
    fs = require('fs');
var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    Comment = mongoose.model('Comment'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    Photo = mongoose.model('Photo'),
    User = mongoose.model('User');
var async = require('async');
var auth = require('../services/auth.js'),
    log = require('../services/error_log.js'),
    socketClient = require('../services/socketClient'),
    uploader = require('../services/uploader.js'),
    tools = require('../tools/tools.js');

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
          if (campaign.team && user.provider === 'user') {
            for (var i = 0; i < campaign.team.length; i++) {
              if (user.isTeamLeader(campaign.team[i].toString())) {
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
//for push comment
var updateUserCommentList = function(campaign, user, reqUserId ,callback){
  var arrayMaxLength = 20;
  if(campaign.whichUnit(user._id)) {//已参加
    var campaignIndex = tools.arrayObjectIndexOf(user.commentCampaigns, campaign._id, '_id');
    if(campaignIndex === -1) {//如果user中没有
      //放到最前,数组长度到max值时去掉最后面的campaign
      user.commentCampaigns.unshift({
        '_id': campaign._id,
        'unread': user._id.toString() == reqUserId.toString() ? 0 : 1
      });
      if(user.commentCampaigns.length>arrayMaxLength) {
        user.commentCampaigns.length = arrayMaxLength;
      }
    }else{//如果存在于user中
      //更新到最前,如果不是自己发的,unread数增加
      if(user._id.toString() != reqUserId.toString())
        user.commentCampaigns[campaignIndex].unread++;
      var campaignNeedUpdate = user.commentCampaigns.splice(campaignIndex,1);
      user.commentCampaigns.unshift(campaignNeedUpdate[0]);
    }
  }else{//未参加
    var campaignIndex = tools.arrayObjectIndexOf(user.unjoinedCommentCampaigns, campaign._id, '_id');
    if(campaignIndex === -1) {//如果user中没有
      //放到最前,数组长度到max值时去掉最后面的campaign
      user.unjoinedCommentCampaigns.unshift({
        '_id': campaign._id,
        'unread': user._id.toString() == reqUserId.toString() ? 0 : 1
      });
      if(user.unjoinedCommentCampaigns.length>arrayMaxLength) {
        user.unjoinedCommentCampaigns.length = arrayMaxLength;
      }
    }else{//如果存在于user中
      //更新到最前,如果不是自己发的,unread数增加
      if(user._id.toString() != reqUserId.toString())
        user.unjoinedCommentCampaigns[campaignIndex].unread++;
      var campaignNeedUpdate = user.unjoinedCommentCampaigns.splice(campaignIndex,1);
      user.unjoinedCommentCampaigns.unshift(campaignNeedUpdate[0]);
    }
  }
  user.save(function(err){
    if(err){
      console.log('user save error:',err);
    }else{
      callback();
    }
  });
};

var socketPush = function(campaign, comment, joinedUids, unjoinedUids){
  var commentCampaign = {
    '_id':campaign._id,
    'theme': campaign.theme,
    'latestComment': campaign.latestComment
  };
  var ct = campaign.campaign_type;
  if(ct===1){
    commentCampaign.logo = campaign.campaign_unit[0].company.logo;
  }
  else if(ct===2||ct===6){//是单小队/部门活动
    commentCampaign.logo = campaign.campaign_unit[0].team.logo;
  }else{//是挑战
    commentCampaign.logo = '/img/icons/vs.png';//图片todo
  }
  var socketComment = {
    '_id': comment._id,
    'poster': comment.poster,
    'createDate': comment.create_date,
    'content': comment.content
  };
  if(comment.photos){
    socketComment.photos = comment.photos;
  }
  socketClient.pushComment(joinedUids, unjoinedUids, commentCampaign, socketComment);
};

/**
 * [userReadComment description]
 * @param  {object} user 用户
 * @param  {string} campaignId 看的是哪个活动的评论
 */
var userReadComment = function (user, campaignId) {
  var find = false;
  for(var i=0; i<user.commentCampaigns.length; i++){
    if(campaignId.toString()===user.commentCampaigns[i]._id.toString()) {
      user.commentCampaigns[i].unread = 0;
      find = true;
      break;
    }
  }
  if(!find){
    for(var i=0; i<user.unjoinedCommentCampaigns.length; i++){
      if(campaignId.toString()===user.unjoinedCommentCampaigns[i]._id.toString()) {
        user.unjoinedCommentCampaigns[i].unread = 0;
        find = true;
        break;
      }
    }
  }
  user.save(function(err){
    if(err){
      console.log('user save error:',err);
    }
  });
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
              return res.status(403).send({ msg: '权限错误' });
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
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/photo_album',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
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
                upload_date: photo.upload_date,
                click: photo.click,
                name: photo.name
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
          height: req.photo.height
        }];
      }
      if (req.body && req.body.content) {
        var content = req.body.content;
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
            var poster = {
              '_id': req.user._id,
              'nickname': req.user.nickname,
              'photo': req.user.photo
            };
            campaign.latestComment = {
              '_id': comment._id,
              'poster': poster,
              'createDate': comment.create_date
            };
            if (content) {
              campaign.latestComment.content = content;
            }
            //如果不在已评论过的人列表
            if (tools.arrayObjectIndexOf(campaign.commentMembers, req.user._id, '_id') === -1) {
              campaign.commentMembers.push(poster);
            }
            //for users操作 & socket
            //参加的人
            var joinedUids = [];
            for(var i = 0; i<campaign.members.length; i++) {
              joinedUids.push(campaign.members[i]._id.toString());
            }
            //未参加
            var unjoinedUids = [];
            for(var i = 0; i<campaign.commentMembers.length;i++) {
              if(joinedUids.indexOf(campaign.commentMembers[i]._id.toString()) === -1){
                unjoinedUids.push(campaign.commentMembers[i]._id.toString());
              }
            }
            //---socket
            socketPush(campaign, comment, joinedUids, unjoinedUids);

            campaign.save(function (err) {
              if (err) {
                log(err);
              }
            });
            var revalentUids = joinedUids.concat(unjoinedUids);
            User.find({'_id':{'$in':revalentUids}},{'commentCampaigns':1,'unjoinedCommentCampaigns':1},function(err,users) {
              if(err){
                console.log(err);
              }else{
                async.map(users,function(user,callback){
                  updateUserCommentList(campaign, user, req.user._id, function(){
                    callback();
                  });
                },function(err, results) {
                  console.log('done');
                  return;
                });
              }
            });
          }
        }
      });
    },


    getComments: function(req, res) {
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
          res.status(202).send({'comments': comments, nextStartDate: nextStartDate});
          userReadComment(req.user, req.query.requestId);
        });
      });
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
            res.status(200).send('success');

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
    },
    getCommentList: function(req, res) {
      var campaigns= [];
      if(req.query.type==='joined')
        campaigns = req.user.commentCampaigns;
      else if(req.query.type === 'unjoined')
        campaigns = req.user.unjoinedCommentCampaigns;
      var campaignIds = [];
      for(var i = 0; i<campaigns.length; i++){
        campaignIds.push(campaigns[i]._id);
      }
      Campaign.find({_id:{'$in':campaignIds}})
      .sort('-latestComment.createDate')
      .exec()
      .then(function (commentCampaigns) {
        var formatCommentCampaigns = [];
        for(var i = 0; i<commentCampaigns.length; i++){
          var campaign = commentCampaigns[i];
          var logo = '';
          var ct = campaign.campaign_type;
          if(ct===1){
            logo = campaign.campaign_unit[0].company.logo;
          }
          else if(ct===2||ct===6){//是单小队/部门活动
            logo = campaign.campaign_unit[0].team.logo;
          }else{//是挑战
            logo = '/img/icons/vs.png';//图片todo
          }
          var indexOfUser = tools.arrayObjectIndexOf(campaigns, campaign._id ,'_id');
          var unread = campaigns[indexOfUser].unread;
          formatCommentCampaigns.push({
            _id: campaign._id,
            theme: campaign.theme,
            latestComment: campaign.latestComment,
            unread: unread,
            logo: logo
          });
        }
        if(req.query.type==='joined') {
          var unjoinedCampaigns = req.user.unjoinedCommentCampaigns;
          var unreadUnjoined = false; // 是否有未读的未参加活动讨论
          for(var i =0; i<unjoinedCampaigns.length; i++){
            if(unjoinedCampaigns[i].unread){
              unreadUnjoined = true;
              break;
            }
          }
          if(unjoinedCampaigns.length>0){
            Campaign.findOne({'_id':unjoinedCampaigns[0]._id}, {'latestComment':1,'theme':1}, function(err, unjoinedCampaign){
              if(err){
                log(err);
              }
              return res.status(200).send({'commentCampaigns':formatCommentCampaigns, 'newUnjoinedCampaignComment':unreadUnjoined, 'latestUnjoinedCampaign':unjoinedCampaign});
            });
          }else{
            return res.status(200).send({'commentCampaigns':formatCommentCampaigns});
          }
        }else{
          return res.status(200).send({'commentCampaigns':formatCommentCampaigns})
        }
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: 'Campaign not found'});
      });
    }
  };
};