'use strict';

var token = require('../../services/token');

module.exports = function(app, ctrl) {
  app.post('/circle/contents', token.needToken, ctrl.v2_0.singleImgUploadSwitcher, ctrl.v2_0.getFormData, ctrl.v2_0.uploadPhotoForContent, ctrl.v2_0.createCircleContent); // 发新同事圈
  app.get('/circle/contents/:contentId', token.needToken, ctrl.v2_0.getCircleContent); // 获取某个消息的内容及其评论
  app.delete('/circle/contents/:contentId', token.needToken, ctrl.v2_0.getCircleContentById, ctrl.v2_0.deleteCircleContent); // 删除已发消息
  app.post('/circle/contents/:contentId/comments', token.needToken, ctrl.v2_0.getCircleContentById, ctrl.v2_0.createCircleComment); // 评论或赞
  app.delete('/circle/comments/:commentId', token.needToken, ctrl.v2_0.deleteCircleComment); // 撤消评论或取消赞
  app.get('/circle/company', token.needToken, ctrl.v2_0.getCompanyCircle); // 获取公司消息及评论
  app.get('/circle/user/:userId', token.needToken, ctrl.v2_0.getUserCircle); // 获取个人同事圈消息及评论
  app.get('/circle/reminds/comments', token.needToken, ctrl.v2_0.getCircleComments); // 获取同事圈提醒(被赞、被评论、赞过或评论过的消息有更新)
  app.get('/circle/reminds', token.needToken, ctrl.v2_0.getReminds); // 获取是否有最新消息  (红点)
};
