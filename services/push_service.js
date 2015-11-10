'use strict';

var mongoose = require('mongoose');
var QuestionComment= mongoose.model('QuestionComment');
var Team = mongoose.model('Team');
var log = require('./error_log.js');
var push = require('./push.js');
var redisService = require('./redis_service.js');
var redisPushQueue = redisService.redisPushQueue;


//type: number //1:群组，2:求助，3:关注
function mergeMsgs(msgList) {
  var msgLength = msgList.length;
  var statistics = [0,0,0];
  for(var i=0; i<msgLength; i++) {
    statistics[msgList[i].type]++;
  }
  var msg = '您的';
  if(statistics[0]) msg+= '群组有了新活动,';
  if(statistics[1]) msg+= '求助有了新回答,';
  if(statistics[2]) msg+= '关注人有了新动态,';
  msg = msg.slice(0, msg.length-1);
  msg+='。';
  return msg;
}

//推送间隔2小时
var interval = 2*3600*1000;
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
  var getListAndPush = function() {
    redisPushQueue.getList(userId)
    .then(function(list) {
      list.push(msg);
      var msgs = mergeMsgs(list);
      push.push(msgs, function(err) {
        err && log(err);
      });
      redisPushQueue.deleteList(userId)
      .then(function(result){
        console.log(result);
      })
      .then(null, function(err) {
        err && log(err);
      });
    })
    .then(null, function(err) {
      err && log(err);
    })
  };

  if(options && options.forcePush) {
    getListAndPush();
  }
  else {
    redisPushQueue.getFirst(userId)
    .then(function(result) {
      if(result && new Date() - result.time > interval) {
        getListAndPush();
      }
      else {
        redisPushQueue.addToQueue(userId, msg)
        .then(function(result) {
          console.log(result);
        })
        .then(null, function(err) {
          log(err);
        });
      }
    })
    .then(null, function(err) {
      err && log(err);
    })
  }
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
      time: new Date(),
      type: 1
    };
    var forcePush = questions.length<maxAnswer ? true:false ;
    insertQueue(question.poster._id, msg, {forcePush:forcePush});
  })
  .then(null, function(err) {
    log(err);
  });
}

/**
 * 关注的人新动态Push接口
 * @param  {User} user 有动态的用户
 */
exports.concernPush = function (user) {
  var concerned = user.concerned;
  if(concerned && concerned.length) {
    var msg = {
      time: new Date(),
      type: 2
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
exports.teamPush = function (teamId) {
  Team.findOne({_id:teamId}, function(err, team) {
    if(err) {
      log(err);
      return;
    }
    var members = team.member;
    if(members && team.member.length){
      var msg = {
        time: new Date(),
        type: 0
      };
      for (var i = members.length - 1; i >= 0; i--) {
        insertQueue(members[i]._id, msg, {forcePush:true});
      }
    }
  })
    
}
