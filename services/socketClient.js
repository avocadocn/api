'use strict';
var moment = require('moment');
var jwt = require('jsonwebtoken');
var client = require('socket.io-client');
var host = "http://127.0.0.1";

var tokenSecret = 'donler';
var mongoose = require('mongoose');
var User = mongoose.model('User');

var getToken = function(){
  var token = jwt.sign({
    type: "server",
    id: 'APIServer',
    exp: moment().add(365, 'days').valueOf()
  }, tokenSecret);
  return token;
}

var socket = client.connect(host+':3005',{query:'token=' + getToken()});
socket.on('connect',function(){
  console.log('connected to socket server');
});

exports.pushChat = function (chatroomId, chat, uids) {
  socket.emit('chatFromServer', chatroomId, chat, uids);
}


//发新朋友圈的push 应该push给公司除了自己所有人
exports.pushCircleContent = function (cid, poster) {
  User.find({'cid':cid, 'active':true, 'mail_active':true , 'disabled':false, '_id':{'$ne':poster._id}},null, function(err, users) {
    if(err) {
      console.log(err.stack);
    }
    else {
      var userIds = [];
      var length = users.length;
      for(var i=0; i<length; i++) {
        userIds.push(users[i]._id);
      }
      socket.emit('circleContent', userIds, poster);
    }
  });
};

//发新朋友圈评论的push 应push给相关用户
exports.pushCircleComment = function (relaventUids, comment) {
  socket.emit('circleComment', relaventUids, comment.poster);
};

//有挑战信或挑战信评论的push,push给对方队长
exports.pushMessage = function (leaderId) {
  socket.emit('competitionMessage', leaderId);
};
