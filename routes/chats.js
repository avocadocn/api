'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/chats', token.needToken, ctrl.canPublishChat, ctrl.uploadPhotoForChat, ctrl.createChat);
  app.get('/chatrooms', token.needToken, ctrl.getChatRooms);

};