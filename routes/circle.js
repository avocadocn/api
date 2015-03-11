'use strict';

var token = require('../services/token');

module.exports = function(app, ctrl) {
  // post /circle_contents 发新消息  
  app.post('/circle_contents', token.needToken, ctrl.getFormData, ctrl.uploadPhotoForContent, ctrl.createCircleContent); 
  // delete /circle_contents/:contentId 删除已发消息  
  app.delete('/circle_contents/:contentId', token.needToken, ctrl.getCircleContentById, ctrl.deleteCircleContent);
  // post /circle_contents/:contentId/comments 评论或赞  
  app.post('/circle_contents/:contentId/comments', token.needToken, ctrl.getCircleContentById, ctrl.createCircleComment);
  // delete /circle_contents/:contentId/comments/:commentId 撤消评论或取消赞  
  app.delete('/circle_contents/:contentId/comments/:commentId', token.needToken, ctrl.deleteCircleComment);
  // get /circle/company 获取公司消息及评论  
  app.get('/circle/company', token.needToken, ctrl.getCompanyCircle);
  // get /circle/campaign 获取活动消息及评论  
  app.get('/circle/campaign/:campaignId', token.needToken, ctrl.getCampaignCircle);
  // get /circle/team 获取个人小队消息及评论 
  app.get('/circle/team/:teamId', token.needToken, ctrl.getTeamCircle);
  // get /circle_reminds/comments 获取同事圈提醒(被赞、被评论、赞过或评论过的消息有更新)  
  app.get('/circle_reminds/comments', token.needToken, ctrl.getCircleComments);
  // delete //circle_reminds/comments' 删除同事圈提醒
  // app.delete('/circle_reminds/comments', token.needToken, ctrl.deleteRemindComment);
  // get /circle_reminds?has_new=true 获取是否有最新消息  (红点)
  // app.get('/circle_reminds', token.needToken, ctrl.getReminds);
};