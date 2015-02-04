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
    exp: moment().add('days', 365).valueOf()
  }, tokenSecret);
  return token;
}

var socket = client.connect(host+':3005',{query:'token=' + getToken()});
socket.on('connect',function(){
  console.log('connected to socket server');
});

//发评论push
exports.pushComment = function (joinedUids, unjoinedUids, campaign, comment) {
  socket.emit('commentFromServer', joinedUids, unjoinedUids, campaign, comment);
};

//发新朋友圈的push 应该push给公司所有人
exports.pushCircleContent = function (cid, photo) {
  var users = [];//todo
  socket.emit('circleContent', users, photo);
};

//发新朋友圈评论的push 应push给相关用户
exports.pushCircleComment = function (relaventUids, photo) {
  socket.emit('circleComment', relaventUids, photo);
};


