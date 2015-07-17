'use strict';

var token = require('../../services/token');

module.exports = function (router, ctrl) {
  router.use('/interaction', token.needToken)
  router.route('/interaction/:interactionType')
    .post(ctrl.v2_0.createInteractionValidate, ctrl.v2_0.createInteraction)
    .get(ctrl.v2_0.getInteraction);
  router.get('/interaction/:interactionType/:interactionId', ctrl.v2_0.getInteractionDetail);
  router.post('/interaction/poll/:interactionId/users/:userId', ctrl.v2_0.poll.poll); //投票
  router.post('/interaction/question/:interactionId/users/:userId', ctrl.v2_0.question.comment); //回答求助或点赞
};