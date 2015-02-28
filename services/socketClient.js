'use strict';
var moment = require('moment');
var jwt = require('jsonwebtoken');
var client = require('socket.io-client');
var host = "http://127.0.0.1";

var tokenSecret = 'donler';

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

exports.pushComment = function(joinedUids, unjoinedUids, campaign, comment){
  socket.emit('commentFromServer', joinedUids, unjoinedUids, campaign, comment);
};