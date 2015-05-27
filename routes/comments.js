'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/comments/host_type/:hostType/host_id/:hostId', token.needToken, ctrl.canPublishComment, ctrl.getCampaignPhotoAlbum, ctrl.uploadPhotoForComment, ctrl.createComments);
  app.get('/comments', token.needToken, ctrl.getComments);
  app.del('/comments/:commentId', token.needToken, ctrl.getCommentById, ctrl.deleteComment);
  // app.get('/comments/list', token.needToken, ctrl.getCommentList);
  // app.post('/comments/read', token.needToken, ctrl.readComments);
};