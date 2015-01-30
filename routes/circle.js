'use strict';

var token = require('../services/token');

module.exports = function(app, ctrl) {
  // post /circle_contents 发新消息  
  app.post('/circle_contents', token.needToken, ctrl.getFormData, ctrl.uploadPhotoForContent, ctrl.createCircleContent);
  // get /circle_contents 获取最新消息 
  app.get('/circle_contents', token.needToken, ctrl.getCircleContents);
  // delete /circle_contents/:contentId 删除已发消息  
  app.delete('/circle_contents/:contentId', token.needToken, ctrl.getCircleContentById, ctrl.deleteCircleContent);
  // post /circle_contents/:contentId/comments 评论或赞  
  app.post('/circle_contents/:contentId/comments', token.needToken, ctrl.getCircleContentById, ctrl.createCircleComment);
  // delete /circle_contents/:contentId/comments/:commentId 撤消评论或取消赞  

  // get /circle_reminds?has_new=true 获取是否有最新消息  
  // get /circle_reminds?userId=xx 获取同事圈提醒(被赞、被评论、赞过或评论过的消息有更新)  
  // get /circle_messages 获取个人消息列表  

  // ## 辅助api
  // get /teams?query 获取小队列表(在现在基础上添加功能)  
  // get /campaigns?query 获取活动列表(在现在基础上添加功能)  
  // 
  // 
  // app.post('/comments/host_type/:hostType/host_id/:hostId', token.needToken, ctrl.canPublishComment, ctrl.getCampaignPhotoAlbum, ctrl.uploadPhotoForComment, ctrl.createComments);
  // app.get('/comments', token.needToken, ctrl.getComments);
  // app.delete('/comments/:commentId', token.needToken, ctrl.getCommentById, ctrl.deleteComment);
  // app.get('/comments/list', token.needToken, ctrl.getCommentList);
  // app.post('/comments/read', token.needToken, ctrl.readComments);
};