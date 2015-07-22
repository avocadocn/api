'use strict';

var token = require('../../services/token');

module.exports = function(app, ctrl) {
  // post /circle_contents 发新消息
  app.post('/circle_contents', token.needToken, ctrl.v2_0.singleImgUploadSwitcher, ctrl.v2_0.getFormData, ctrl.v2_0.uploadPhotoForContent, ctrl.v2_0.createCircleContent);
  // 获取某个内容的详情及其评论
  app.get('/circle_contents/:contentId', token.needToken, ctrl.v2_0.getCircleContent);
  // delete /circle_contents/:contentId 删除已发消息
  app.delete('/circle_contents/:contentId', token.needToken, ctrl.v2_0.getCircleContentById, ctrl.v2_0.deleteCircleContent);
  // post /circle_contents/:contentId/comments 评论或赞
  app.post('/circle_contents/:contentId/comments', token.needToken, ctrl.v2_0.getCircleContentById, ctrl.v2_0.createCircleComment);
  // delete /circle_comments/:commentId 撤消评论或取消赞
  app.delete('/circle_comments/:commentId', token.needToken, ctrl.v2_0.deleteCircleComment);
  // get /circle/company 获取公司消息及评论
  app.get('/circle/company', token.needToken, ctrl.v2_0.getCompanyCircle);
  app.get('/circle/team/:teamId', token.needToken, ctrl.v2_0.getTeamCircle);
  // get /circle/campaign/:campaignId 获取活动消息及评论
  app.get('/circle/campaign/:campaignId', token.needToken, ctrl.v2_0.getCampaignCircle);
  // get /circle/team/:teamId 获取个人小队消息及评论
  app.get('/circle/user/:userId', token.needToken, ctrl.v2_0.getUserCircle);
  // get /circle_reminds/comments 获取同事圈提醒(被赞、被评论、赞过或评论过的消息有更新)
  app.get('/circle_reminds/comments', token.needToken, ctrl.v2_0.getCircleComments);
  // delete //circle_reminds/comments' 删除同事圈提醒
  // app.delete('/circle_reminds/comments', token.needToken, ctrl.v1_3.deleteRemindComment);
  // get /circle_reminds?has_new=true 获取是否有最新消息  (红点)
  app.get('/circle_reminds', token.needToken, ctrl.v2_0.getReminds);
};
