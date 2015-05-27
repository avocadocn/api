'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/chatrooms/:chatroomId/chats', token.needToken, ctrl.canPublishChat, ctrl.uploadPhotoForChat, ctrl.searchRecommandTeam, ctrl.createChat);
  app.get('/chats', token.needToken, ctrl.getChats);
  app.del('/chats/:chatId', token.needToken, ctrl.deleteChat);
  app.post('/chatrooms/actions/read', token.needToken, ctrl.readChatRoomChats);
  app.get('/chatrooms', token.needToken, ctrl.getChatRooms);
  app.get('/chatrooms/unread', token.needToken, ctrl.getChatroomsUnread);

};