'use strict';

var mongoose = require('mongoose'),
  Chat = mongoose.model('Chat'),
  User = mongoose.model('User'),
  log = require('../services/error_log.js'),
  socketClient = require('../services/socketClient');
exports.createChat = function (param,callback) {
  var chat = new Chat({
    chatroom_id: param.chatroomId,
    content: param.content,
    poster: param.user? param.user._id: undefined
  });
  if (param.photo) {
    chat.photos = param.photo;
  }
  if(param.chatType) {
    var chatType = param.chatType;
    chat.chat_type = chatType ;
    if(chatType>2) {
      if(param.competitionMessageId) {
        chat.competition_message = param.competitionMessageId;
      }
      if(param.campaign){
        chat.campaign=param.campaign
      }
      //挑战提醒类型的发送方为小队
      chat.poster_team = param.posterTeam._id;
    }
  }
  if(param.competition_type) {
    chat.competition_type = param.competition_type;
  }
  if(param.opponent_team) {
    chat.opponent_team = param.opponent_team._id;
  }
  chat.save(function (err) {
    if (err) {
      log(err)
      callback && callback(err);
    }
    else {
      if (param.photo) chat.photos[0].ori_uri = null; //对外隐藏此属性
      callback && callback(null,chat);
      //找出相关人员
      User.find({
        // 'cid': param.user.cid,
        'chatrooms': {'$elemMatch': {'_id': chat.chatroom_id}}
      }, {'chatrooms': 1}, function (err, users) {
        if (err) {
          log(err);
        }
        else {
          //socket推送
          var userIds = [];
          var usersLength = users.length;
          for (var i = 0; i < usersLength; i++) {
            userIds.push(users[i]._id);
          }
          var socketChat = {
            '_id': chat._id,
            'chatroom_id': chat.chatroom_id,
            'create_date': chat.create_date,
            'content': chat.content,
            'randomId': param.randomId,
            'chat_type': chat.chat_type,
            'comptition_type': chat.competition_type,
            'campaign': chat.campaign
          };
          if(param.user) {
            socketChat.poster = {
              '_id': chat.poster,
              'photo': param.user.photo,
              'nickname': param.user.nickname
            }
          }
          else if(param.posterTeam) {
            socketChat.poster_team = {
              '_id': param.posterTeam._id,
              'logo': param.posterTeam.logo,
              'name': param.posterTeam.name
            }
            socketChat.poster = socketChat.poster_team;
          }
          if(chat.photos) {
            socketChat.photos = chat.photos;
          }
          if(chat.opponent_team) {
            socketChat.opponent_team = {
              '_id' : param.opponent_team._id,
              'logo' : param.opponent_team.logo,
              'name' : param.opponent_team.name,
              'cname' : param.opponent_team.cname
            }
          }
          socketClient.pushChat(chat.chatroom_id, socketChat, userIds);
        }
      });
    }
  });
}