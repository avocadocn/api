'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/chats', token.needToken, ctrl.canPublishChat, ctrl.uploadPhotoForChat, ctrl.createChat);
  app.get('/chats', token.needToken, ctrl.getChats);
  app.delete('/chats/:chatId', token.needToken, ctrl.deleteChat);
  app.get('/chatrooms', token.needToken, ctrl.getChatRooms);

};