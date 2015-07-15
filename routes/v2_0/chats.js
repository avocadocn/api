'use strict';

var token = require('../../services/token');

module.exports = function (app, ctrl) {

  app.post('/chatrooms/:chatroomId/chats', token.needToken, ctrl.v1_3.canPublishChat, ctrl.v1_3.uploadPhotoForChat, ctrl.v1_3.searchRecommandTeam, ctrl.v1_3.createChat);
  app.get('/chats', token.needToken, ctrl.v1_3.getChats);
  app.delete('/chats/:chatId', token.needToken, ctrl.v1_3.deleteChat);
  app.post('/chatrooms/actions/read', token.needToken, ctrl.v1_3.readChatRoomChats);
  app.get('/chatrooms', token.needToken, ctrl.v1_3.getChatRooms);
  app.get('/chatrooms/unread', token.needToken, ctrl.v1_3.getChatroomsUnread);

};