'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/comments', token.needToken, ctrl.canPublishComment, ctrl.createComments);
  app.get('/comments', token.needToken, ctrl.getComments);
  app.delete('/comments/:commentId', token.needToken, ctrl.getCommentById, ctrl.deleteComment);
};