'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    Comment = mongoose.model('Comment');
var auth = require('../services/auth.js');
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
          console.log('COMMENT_PUSH_ERROR', err);
          return res.send("{{'COMMENT_PUSH_ERROR'|translate}}");
        } else {
          if (host_type === "campaign" || host_type === "campaign_detail" || host_type === "competition") {
            Campaign.findByIdAndUpdate(host_id, {'$inc': {'comment_sum': 1}}, function (err, message) {
              if (err || !message) {
                return res.send({'msg': 'ERROR', 'comment': []});
              } else {
                //之后改成用socket通信
                return res.send({'msg': 'SUCCESS', 'comment': comment});
              }
            });
          } else {
            return res.send({'msg': 'SUCCESS', 'comment': comment});
          }
        }
      });
    },
    canPublishComment: function(req, res) {
      var host_id = req.body.host_id;
      var host_type = req.body.host_type.toLowerCase();
      switch (host_type) {
        case 'campaign':
          Campaign.findById(host_id).exec()
          .then(function (campaign) {
            if (!campaign) {
              return res.status(403).send('权限错误');
            }
            var allow = auth(req.user, {
              companies: campaign.cid,
              teams: campaign.tid
            }, ['publishComment']);
            if (allow.publishComment === false) {
              return res.status(403).send('权限错误');
            } else {
              next();
            }
          })
          .then(null, function (err) {
            next(err);
          });
          break;
        default:
          return res.status(403).send('权限错误');
      }
    }
  };
};