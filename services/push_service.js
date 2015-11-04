'use strict';

var mongoose = require('mongoose');
var QuestionComment= mongoose.model('QuestionComment');
var log = require('./error_log.js');
var push = require('./push.js');
var redisService = require('./redis_service.js');
/**
 * 插入/读取队列
 * 若是options.forcePush为true则立即推送
 *   否则看是否满两小时，满了就推
 * @param {string} userId
 * @param {object} msg {
 *                     body: '',
 *                     title: '',
 *                     time: date,
 *                     type: number //1:群组，2:求助，3:关注
 *                 }
 * @param {[type]} options {
 *                     forcePush: boolean
 *                 }
 * 
 */
function insertQueue(userId, msg, options) {

}

/**
 * 有人回答的push
 * @param  {Interaction} question
 */
exports.questionPush = function (question) {
  // 查询回答数是否<10
  var maxAnswer = 10;
  QuestionComment.find({interactionId:question._id})
  .limit(maxAnswer)
  .exec()
  .then(function (questions) {
    var msg = {
      body: '提问有了新回答',
      title: '提问有了新回答',
      time: new Date(),
      type: 2
    };
    var forcePush = questions.length<maxAnswer ? true:false ;
    insertQueue(question.poster._id, msg, {forcePush:forcePush});
  })
  .then(null, function(err) {
    log(err);
  })  
}

/**
 * 关注的人新动态Push接口
 * @param  {User} user 有动态的用户
 */
exports.concernPush = function (user) {
  var concerned = user.concerned;
  if(concerned && concerned.length) {
    var msg = {
      body: '关注的人有新动态',
      title: '关注的人有新动态',
      time: new Date(),
      type: 3
    };
    for(var i = concerned.length-1; i>=0; i--) {
      insertQueue(concerned[i], msg);
    }
  }
}

/**
 * 群组有新活动Push接口
 * @param  {Team} team  
 */
exports.teamPush = function (team) {
  var members = team.member;
  if(members && team.member.length){
    var msg = {
      body: '群组有新活动',
      title: '群组有新活动',
      time: new Date(),
      type: 1
    };
    for (var i = members.length - 1; i >= 0; i--) {
      insertQueue(members[i]._id, msg, {forcePush:true});
    }
  }
}
