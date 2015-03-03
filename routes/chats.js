'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/comments/:chatroomId', token.needToken, ctrl.canPublishChat, ctrl.uploadPhotoForChat, ctrl.createChat);
  // app.get('/comments', token.needToken, ctrl.getComments);
  // app.delete('/comments/:commentId', token.needToken, ctrl.getCommentById, ctrl.deleteComment);
  // app.get('/comments/list', token.needToken, ctrl.getCommentList);
  // app.post('/comments/read', token.needToken, ctrl.readComments);
};