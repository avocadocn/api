'use strict';

var token = require('../../services/token');

module.exports = function (router, ctrl) {
  router.use('/interaction', token.needToken)
  router.route('/interaction')
    .post(ctrl.v2_0.interaction.createInteractionValidate, ctrl.v2_0.interaction.createInteraction)          //发起互动
    .get(ctrl.v2_0.interaction.getInteraction);                                                              //获取互动列表
  router.get('/interaction/:interactionType/:interactionId', ctrl.v2_0.interaction.getInteractionDetail);    //获取互动详情

  router.route('/interaction/template')
    .post(ctrl.v2_0.template.createTemplateValidate, ctrl.v2_0.template.createTemplate)                     //发模板                                                                //发起活动模板
    .get(ctrl.v2_0.template.getTemplateList);                                                               //获取模板列表
  router.route('/interaction/template/:templateType/:templateId')
    .get(ctrl.v2_0.template.getTemplateDetail);                                                             //获取模板详情
  
  router.route('/interaction/acitvity/:interactionId/users/:userId')
    .post(ctrl.v2_0.activity.join)                                                                          //参加活动
    .delete(ctrl.v2_0.activity.quit);                                                                       //退出活动
  router.post('/interaction/poll/:interactionId/users/:userId', ctrl.v2_0.poll.poll);                       //进行投票

  router.route('/interaction/question/:interactionId/users/:userId')
    .post(ctrl.v2_0.question.comment)                                                                       //回答求助或点赞
    .put(ctrl.v2_0.question.adopt);                                                                         //采纳回答
  router.route('/interaction/question/:interactionId/comment')
    .get(ctrl.v2_0.question.getComments);                                                                   //获取求助的评论列表
};