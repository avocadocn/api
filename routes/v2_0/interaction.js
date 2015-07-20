'use strict';

var token = require('../../services/token');

module.exports = function (router, ctrl) {
  router.use('/interaction', token.needToken)
  router.route('/interaction')
    .post(ctrl.v2_0.createInteractionValidate, ctrl.v2_0.createInteraction)                      //发起互动
    .get(ctrl.v2_0.getInteraction);                                                              //获取互动列表

  router.route('/interaction/activityTemplate')
    .post(ctrl.v2_0.createActivityTemplate);                      //发起活动模板
  router.get('/interaction/:interactionType/:interactionId', ctrl.v2_0.getInteractionDetail);    //获取互动详情
  router.post('/interaction/poll/:interactionId/users/:userId', ctrl.v2_0.poll.poll);            //进行投票
  router.route('/interaction/question/:interactionId/users/:userId')
    .post(ctrl.v2_0.question.comment)                                                            //回答求助或点赞
    .put(ctrl.v2_0.question.adopt);                                                              //采纳回答
};