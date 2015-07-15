'use strict';

var token = require('../../services/token');

module.exports = function (app, ctrl) {

  app.post('/comments/host_type/:hostType/host_id/:hostId', token.needToken, ctrl.v1_3.canPublishComment, ctrl.v1_3.getCampaignPhotoAlbum, ctrl.v1_3.uploadPhotoForComment, ctrl.v1_3.createComments);
  app.get('/comments', token.needToken, ctrl.v1_3.getComments);
  app.delete('/comments/:commentId', token.needToken, ctrl.v1_3.getCommentById, ctrl.v1_3.deleteComment);
  // app.get('/comments/list', token.needToken, ctrl.v1_3.getCommentList);
  // app.post('/comments/read', token.needToken, ctrl.v1_3.readComments);
};