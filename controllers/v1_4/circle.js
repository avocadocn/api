'use strict';

var path = require('path'),
  fs = require('fs');
var multiparty = require('multiparty');
var mongoose = require('mongoose');
var CircleContent = mongoose.model('CircleContent'),
  CircleComment = mongoose.model('CircleComment'),
  File = mongoose.model('File'),
  User = mongoose.model('User'),
  Campaign = mongoose.model('Campaign'),
  Company = mongoose.model('Company'),
  CompanyGroup = mongoose.model('CompanyGroup'),
  Chat = mongoose.model('Chat'),
  CompetitionMessage = mongoose.model('CompetitionMessage');
var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  socketClient = require('../../services/socketClient'),
  uploader = require('../../services/uploader.js'),
  tools = require('../../tools/tools.js'),
  async = require('async');



module.exports = function(app) {
  return {

    singleImgUploadSwitcher: function (req, res, next) {

      /**
       * 如果前端不能一次上传多张照片，则另外处理。
       * 此时使用另外的上传文件api，不在此路由上传文件，所以这里可以获取req.body。
       * 处理流程如下：
       * 1. 先发一个请求，创建CircleContent，设置其状态为等待上传，并返回id给前端
       * 2. 发请求上传图片，使用另一个api
       * 3. 图片全部传好后，再发一次创建CircleContent的请求，确认已经传好，并查询File数据，将uri等相关信息保存到CircleConten中
       *    激活CircleContent
       *
       * req.body.isUploadImgFromFileApi: Boolean // 是否先通过文件api上传完图片再创建
       * req.body.uploadStep: String // 上传步骤，可以为'create'或'active'对应上述的第1步和第3步
       */
      if (req.body && req.body.isUploadImgFromFileApi === true) {
        singleUpload(req, res, next);
      }
      else {
        next();
      }
    },

    /**
     * [getFormData description]
     * To parse the form data from the fore-end
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getFormData: function(req, res, next) {
      if (req.user.provider === 'company') {
        return res.status(403).send({
          msg: '公司账号暂无同事圈功能'
        });
      }
      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });

      form.parse(req, function(err, fields, files) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }

        // Send error(400) when don't have content and images
        if ((fields['content'] == undefined || !fields['content'][0]) && !files[fieldName]) {
          return res.sendStatus(400);
        }

        // req.tid = (fields['tid'] && fields['tid'][0]) ? fields['tid'][0] : [];
        req.campaign_id = (fields['campaign_id'] && fields['campaign_id'][0]) ? fields['campaign_id'][0] : null;
        req.content = (fields['content'] && fields['content'][0]) ? fields['content'][0] : null;

        // send error(400) when campain_id is null
        if (!req.campaign_id) {
          return res.status(400).send({
            msg: '参数错误'
          });
        }

        // Judge authority
        Campaign.findById(req.campaign_id).exec()
          .then(function(campaign) {
            if (!campaign) {
              return res.status(400).send({
                msg: '无此活动'
              });
            }
            var role = auth.getRole(req.user, {
              companies: campaign.cid,
              teams: campaign.tid,
              users: campaign.relativeMemberIds
            });
            var taskName = campaign.campaign_type == 1 ? 'publishCompanyCircle' : 'publishTeamCircle';
            var allow = auth.auth(role, [taskName]);
            if (!allow[taskName]) {
              return res.status(403).send({
                msg: '您没有权限发同事圈'
              });
            }
            // set req.tid
            req.tid = campaign.campaign_type == 1 ? [] : campaign.tid;
            req.relative_cids = campaign.cid;

            var post_user_tid = null;
            var campaign_unit = campaign.campaign_unit;
            var findUserTeam = false;
            for (var i = 0; i < campaign_unit.length && !findUserTeam; i++) {
              var members = campaign_unit[i].member;
              for (var j = 0; j < members.length; j++) {
                if (members[j]._id.toString() == req.user.id) {
                  post_user_tid = campaign_unit[i].team._id.toString();
                  findUserTeam = true;
                  break;
                }
              }
            }
            req.post_user_tid = post_user_tid;

            if (files[fieldName]) {
              req.imgFiles = files[fieldName];
            }
            next();

          })
          .then(null, function(err) {
            log(err);
            return res.sendStatus(500);
          })


      });
    },
    /**
     * Upload images for the circle content
     * Images upload path: /public/img/circle/{YYYY-MM}/{cid}/{DateTime.jpg}
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    uploadPhotoForContent: function(req, res, next) {
      if (!req.imgFiles) {
        // 不传照片的话直接到下一步
        next();
        return ;
      }

      var files = req.imgFiles;
      async.map(files, function(file, callback) {
        uploader.uploadImage(file, {
          targetDir: '/public/img/circle',
          subDir: req.user.getCid().toString(),
          saveOrigin: true,
          getSize: true,
          success: function(imgInfo, oriCallback) {
            callback(null, imgInfo);
          },
          error: function(err) {
            log(err);
            return res.status(500).send({ msg: '服务器错误' });
          }
        });

      }, function(err, results) {
        if (err) {
          log(err);
        }
        req.imgInfos = results;
        next();
      });

    },
    /**
     * Create circle content
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createCircleContent: function(req, res) {
      var photos = [];
      if (req.imgInfos) {
        req.imgInfos.forEach(function(imgInfo) {
          var photo = {
            uri: imgInfo.url,
            width: imgInfo.size.width,
            height: imgInfo.size.height
          };
          photos.push(photo);
        });
      }

      var circleContent = new CircleContent({
        cid: req.user.getCid(), // 所属公司id

        tid: req.tid, // 关联的小队id(可选，不是必要的)

        campaign_id: req.campaign_id, // 关联的活动id(可选，不是必要的)

        content: req.content, // 文本内容(content和photos至少要有一个)

        photos: photos, // 照片列表

        post_user_id: req.user._id, // 发消息的用户的id（头像和昵称再次查询）

        post_user_tid: req.post_user_tid,

        relative_cids: req.relative_cids // 参加同事圈消息所属的活动的所有公司id
      });

      circleContent.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            // 'msg': '同事圈消息发送成功',
            'circleContent': circleContent // this field is used for test
          });
          Campaign.update({
            _id: circleContent.campaign_id
          }, {
            $inc: {
              circle_content_sum: 1
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
          });
          //socket
          var poster = {
            _id: req.user._id,
            nickname: req.user.nickname,
            photo: req.user.photo
          };
          socketClient.pushCircleContent(circleContent.cid, poster);
        }
      });
    }
  }
};

/**
 * 获取是否有新chat
 * @param  {object}   user
 * @param  {Function} callback function(err, unread)
 *                             unread: boolean
 */
function hasNewChat (user, callback) {
  async.map(user.chatrooms, function(chatroom, mapCallback) {
    Chat.findOne({chatroom_id: chatroom._id, create_date: {'$gt':chatroom.read_time}},{'_id':1},function(err, chat) {
      if(err) {
        mapCallback(err);
      }
      else {
        mapCallback(null, {_id: chatroom._id, unread: chat});
      }
    });
  }, function(err, results) {
    if(err) {
      callback(err);
    }
    else {
      var chatUnread = false;
      for (var i = results.length - 1; i >= 0; i--) {
        if(results[i].unread) {
          chatUnread = true;
          break;
        }
      };
      callback(null, chatUnread);
    }
  });
};

/**
 * 获取是否有新挑战信信息
 * @param  {object}   user
 * @param  {Function} callback function(err, unread)
 *                             unread: boolean
 */
function hasNewDiscover (user, callback) {
  var leaderTeamIds = [];
  for (var i = user.team.length - 1; i >= 0; i--) {
    if(user.team[i].leader === true) {
      leaderTeamIds.push(user.team[i]._id);
    }
  };
  CompetitionMessage.findOne({
    '$or': [
      {'$and':[{'sponsor_team': {'$in': leaderTeamIds}}, {'sponsor_unread':true}]},
      {'$and':[{'opposite_team': {'$in': leaderTeamIds}}, {'opposite_unread':true}]}
    ]
  }, function(err, result) {
    if(err) {
      callback(err);
    }
    else {
      callback(null, result ? true: false);
    }
  });
};

// 处理只能一次请求只能传一张图片时发同事圈的请求
function singleUpload(req, res, next) {
  if (req.body.uploadStep === 'create') {
    createCircleContent(req, res, next);
  }
  else if (req.body.uploadStep === 'active') {
    activeCircleContent(req, res, next);
  }
}

// 创建同事圈的内容
function createCircleContent(req, res, next) {

  // filter
  if (!req.body.campaign_id) {
    res.status(400).send({
      msg: '参数不足'
    });
    return;
  }

  // auth
  Campaign.findById(req.body.campaign_id).exec()
    .then(function(campaign) {
      if (!campaign) {
        res.status(403).send({
          msg: '您没有权限'
        });
        return;
      }

      var role = auth.getRole(req.user, {
        companies: campaign.cid,
        teams: campaign.tid,
        users: campaign.relativeMemberIds
      });

      var taskName = campaign.campaign_type == 1 ? 'publishCompanyCircle' : 'publishTeamCircle';
      var allow = auth.auth(role, [taskName]);
      if (!allow[taskName]) {
        res.status(403).send({
          msg: '您没有权限'
        });
        return;
      }

      var tid = campaign.campaign_type == 1 ? [] : campaign.tid;
      var relative_cids = campaign.cid;
      // 发消息用户所属小队id， 若为null, 则该消息为公司活动消息
      var post_user_tid = null;
      var campaign_unit = campaign.campaign_unit;
      var findUserTeam = false;
      for (var i = 0; i < campaign_unit.length && !findUserTeam; i++) {
        var members = campaign_unit[i].member;
        for (var j = 0; j < members.length; j++) {
          if (members[j]._id.toString() == req.user.id&&campaign_unit[i].team&&campaign_unit[i].team._id) {
            post_user_tid = campaign_unit[i].team._id.toString();
            findUserTeam = true;
            break;
          }
        }
      }
      // console.log(post_user_tid);
      // create
      var circleContent = new CircleContent({
        cid: req.user.getCid(), // 所属公司id
        tid: tid, // 关联的小队id(可选，不是必要的)
        campaign_id: campaign._id, // 关联的活动id(可选，不是必要的)
        post_user_id: req.user._id, // 发消息的用户的id（头像和昵称再次查询）
        post_user_tid: post_user_tid, // 发消息用户所属小队id
        relative_cids: relative_cids, // 参加同事圈消息所属的活动的所有公司id
        status: 'wait'
      });
      if (req.body.content) {
        circleContent.content = req.body.content;
      }
      circleContent.save(function(err) {
        if (err) {
          next(err);
        } else {
          res.send({
            msg: '创建成功，等待文件上传',
            id: circleContent.id
          });

        }
      });

    })
    .then(null, next);

}

// 激活
function activeCircleContent(req, res, next) {
  CircleContent.findById(req.body.circleContentId).exec()
    .then(function(circleContent) {
      if (!circleContent) {
        res.status(403).send({
          msg: '您没有权限'
        });
        return;
      }

      // 查找circleContent对应的文件
      File.find({
        'owner.kind': 'CircleContent',
        'owner._id': circleContent._id
      }, {
        _id: 0,
        uri: 1,
        width: 1,
        height: 1,
        circle_index:1
      })
      .sort('circle_index')
      .exec()
      .then(function(files) {
        if (files.length === 0 && (!circleContent.content || circleContent.content === '')) {
          res.send({
            msg: '发表失败，不允许既无文本内容又没有图片'
          });
          // TODO: 可以考虑将此CircleContent从数据库中删除，或是定期清除
          return;
        }
        circleContent.photos = files;
        circleContent.status = 'show';
        circleContent.save(function(err) {
          if (err) {
            next(err);
          } else {
            res.send({
              msg: '发表成功',
              circleContent: circleContent
            });
            // 更新活动精彩瞬间数目
            Campaign.update({
              _id: circleContent.campaign_id
            }, {
              $inc: {
                circle_content_sum: 1
              }
            }, function(err, numberAffected) {
              if(err) {
                log(err);
              }
            });

            var poster = {
              _id: req.user._id,
              nickname: req.user.nickname,
              photo: req.user.photo
            };
            socketClient.pushCircleContent(circleContent.cid, poster);
          }
        });
      })
      .then(null, next);
    })
    .then(null, next);
}
