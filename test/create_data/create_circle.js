'use strict';

var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var CircleContent = mongoose.model('CircleContent');
var CircleComment = mongoose.model('CircleComment');
var chance = require('chance').Chance();

/**
 * Generate Circle Data
 * @param {Function} callback function(err, groups){}
 *
 */
var createCircle = function(users, callback) {
  if (users.length <= 0) {
    callback()
    return;
  }
  var circles = [];
  var circleContents = [];

  // 公司第一个用户发3条消息， 第1~2个消息状态为'show', 第3个消息状态为'delete'
  for (var i = 0; i < 3; i++) {
    var status = 'delete';
    if (i < 2) {
      status = 'show';
    }
    var circleContent = new CircleContent({
      cid: users[0].cid,
      content: chance.string({
        length: 10,
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
      }),
      post_user_id: users[0]._id,
      status: status
    });
    circleContents.push(circleContent);
  }

  function createCircleComment(options, callback) {
      var circleComment = new CircleComment({
        kind: options.kind,
        target_content_id: options.circleContent._id,
        target_user_id: options.circleContent.post_user_id,
        post_user_cid: options.user.cid,
        post_user_id: options.user._id,
        status: options.status,
        relative_user_ids: options.relative_user_ids
      });

      callback(null, circleComment);
    }
    // 评论都是对消息的评论
    // 第一个消息： 消息发布者(公司第一个用户)发表评论
  var circle_1 = {
    content: null,
    comments: []
  };

  createCircleComment({
    kind: 'appreciate',
    circleContent: circleContents[0],
    user: users[0],
    status: 'show',
    relative_user_ids: []
  }, function(err, comment) {
    circle_1.comments.push(comment);
  });
  circle_1.content = circleContents[0];

  // 第二个消息： 公司第2，3个用户依次发表评论
  var circle_2 = {
    content: null,
    comments: []
  };
  var first_user_ids = [];
  first_user_ids.push(users[0]._id);
  createCircleComment({
    kind: 'appreciate',
    circleContent: circleContents[1],
    user: users[1],
    status: 'show',
    relative_user_ids: first_user_ids
  }, function(err, comment) {
    circle_2.comments.push(comment);
  });
  first_user_ids.push(users[1]._id);
  createCircleComment({
    kind: 'appreciate',
    circleContent: circleContents[1],
    user: users[2],
    status: 'show',
    relative_user_ids: first_user_ids
  }, function(err, comment) {
    circle_2.comments.push(comment);
  });
  var first_comment_users = [];
  for (var i = 1; i < 3; i++) {
    first_comment_users.push({
      _id: users[i]._id,
      comment_num: 1
    });
  }
  circleContents[1].comment_users = first_comment_users;
  circle_2.content = circleContents[1];

  // 第三个消息(删除)： 公司第2，3个用户依次发表评论， 但第2个用户评论删除，最后删除消息
  var circle_3 = {
    content: null,
    comments: []
  };

  var user_ids = [];
  user_ids.push(users[0]._id);
  createCircleComment({
    kind: 'appreciate',
    circleContent: circleContents[2],
    user: users[1],
    status: 'delete',
    relative_user_ids: user_ids
  }, function(err, comment) {
    circle_3.comments.push(comment);
  });
  user_ids.push(users[1]._id);
  createCircleComment({
    kind: 'appreciate',
    circleContent: circleContents[2],
    user: users[2],
    status: 'content_delete',
    relative_user_ids: user_ids
  }, function(err, comment) {
    circle_3.comments.push(comment);
  });
  var comment_users = [];
  for (var j = 1; j < 3; j++) {
    comment_users.push({
      _id: users[j]._id,
      comment_num: (j - 1)
    });
  }
  circleContents[2].comment_users = comment_users;
  circle_3.content = circleContents[2];

  circles.push(circle_1);
  circles.push(circle_2);
  circles.push(circle_3);
  // 保存消息
  async.map(circles, function(circle, callback) {
      async.parallel([
          function(callback) {
            circle.content.save(function(err){
              callback(err);
            });
          },
          function(callback) {
            async.map(circle.comments, function(comment, callback) {
              comment.save(function(err){
                callback(err);
              });
            }, function(err, results) {
              callback(err);
            });
          }
        ],
        function(err, results) {
          callback(err);
        });
    },
    function(err, results) {
      callback(err, circles)
    });
};

module.exports = createCircle;