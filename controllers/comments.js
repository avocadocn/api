'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    Comment = mongoose.model('Comment'),
    User = mongoose.model('User');
var auth = require('../services/auth.js'),
    log = require('../services/error_log.js'),
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

module.exports = function (app) {

  return {

    createComments: function (req, res) {
      var host_id = req.body.host_id;  //留言主体的id,这个主体可以是 一条活动、一张照片、一场比赛等等
      var content = req.body.content;
      var host_type = req.body.host_type.toLowerCase();
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
      comment.content = content;
      comment.host_id = host_id;
      comment.poster = poster;

      if (req.session.uploadData) {
        // 如果有上传照片的数据，依然要判断是否过期
        var aMinuteAgo = Date.now() - moment.duration(1, 'minutes').valueOf();
        aMinuteAgo = new Date(aMinuteAgo);

        if (aMinuteAgo <= req.session.uploadData.date) {
          // 在一分钟之内，上传的照片有效
          comment.photos = req.session.uploadData.photos;
        }
        req.session.uploadData = null;
      }

      comment.save(function (err) {
        if (err) {
          //'COMMENT_PUSH_ERROR'
          log(err);
          return res.status(500).send("{{'COMMENT_PUSH_ERROR'|translate}}");
        } else {
          if (host_type === "campaign" || host_type === "campaign_detail" || host_type === "competition") {
            Campaign.findById(host_id,function(err, campaign){
              campaign.comment_sum++;
              var poster = {
                '_id': req.user._id,
                'nickname': req.user.nickname,
                'photo': req.user.photo
              };
              campaign.latestComment = {
                '_id': comment._id,
                'poster': poster,
                'content': content
              };
              //如果不在已评论过的人列表
              if(tools.arrayObjectIndexOf(campaign.commentMembers, req.user._id, '_id') === -1){
                campaign.commentMembers.push(poster);
              }
              campaign.save(function(err){
                if(err){
                  log(err);
                }
              });

              //users操作
              var revalentUids = [];
              for(var i = 0; i<campaign.members.length; i++){
                revalentUids.push(campaign.members[i]._id);
              }
              for(var i = 0; i<campaign.commentMembers.length;i++){
                revalentUids.push(campaign.commentMembers[i]._id);
              }
              var arrayMaxLength = 20;
              User.find({'_id':{'$in':revalentUids}},{'commentCampaigns':1,'unjoinedCommentCampaigns':1},function(err,users){
                if(err){
                  console.log(err);
                }else{
                  async.map(users,function(user,callback){
                    //已参加
                    if(campaign.whichUnit(user._id)) {
                      var campaignIndex = tools.arrayObjectIndexOf(user.commentCampaigns,host_id,'_id');
                      if(campaignIndex === -1){//如果user中没有
                        //放到最前,数组长度到max值时去掉最后面的campaign
                        user.commentCampaigns.unshift({
                          '_id': host_id,
                          'unread': 0
                        });
                        if(user.commentCampaigns.length>arrayMaxLength){
                          user.commentCampaigns.length = arrayMaxLength;
                        }
                      }else{//如果存在于user中
                        //更新到最前,如果不是自己发的,unread数增加
                        if(user._id.toString() != req.user._id.toString())
                          user.commentCampaigns[campaignIndex].unread++;
                        var campaignNeedUpdate = user.commentCampaigns.splice(campaignIndex,1);
                        user.commentCampaigns.unshift(campaignNeedUpdate[0]);
                      }
                    }else{
                      var campaignIndex = tools.arrayObjectIndexOf(user.unjoinedCommentCampaigns,host_id,'_id');
                      if(campaignIndex === -1){//如果user中没有
                        //放到最前,数组长度到max值时去掉最后面的campaign
                        user.unjoinedCommentCampaigns.unshift({
                          '_id': host_id,
                          'unread': 0
                        });
                        if(user.unjoinedCommentCampaigns.length>arrayMaxLength){
                          user.unjoinedCommentCampaigns.length = arrayMaxLength;
                        }
                      }else{//如果存在于user中
                        //更新到最前,如果不是自己发的,unread数增加
                        if(user._id.toString() != req.user._id.toString())
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
                  },function(err, results) {
                    console.log('done');
                    return;
                  })
                }
              })
            });
          } else {
            return res.status(200).send({'comment': comment});
          }
        }
      });
    },
    canPublishComment: function(req, res, next) {
      var host_id = req.body.host_id;
      var host_type = req.body.host_type.toLowerCase();
      switch (host_type) {
        case 'campaign':
          Campaign.findById(host_id).exec()
          .then(function (campaign) {
            if (!campaign) {
              return res.status(403).send({msg: '权限错误'});
            }
            var allow = auth(req.user, {
              companies: campaign.cid,
              teams: campaign.tid
            }, ['publishComment']);
            if (allow.publishComment === false) {
              return res.status(403).send({msg: '权限错误'});
            } else {
              next();
            }
          })
          .then(null, function (err) {
            next(err);
          });
          break;
        default:
          return res.status(403).send({msg: '权限错误'});
      }
    },

    getComments: function(req, res) {
      //todo 获取评论，包括reply与comment
    },

    deleteComment: function(req, res) {
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
              photo_album_ctrl.deletePhotos(comment.photos, function (err) {
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