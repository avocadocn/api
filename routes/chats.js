'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/chats/:chatroomId', token.needToken, ctrl.canPublishChat, ctrl.uploadPhotoForChat, ctrl.createChat);
  app.get('/chats/chatrooms', token.needToken, ctrl.getChatRooms);

};