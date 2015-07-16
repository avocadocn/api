'use strict';

var token = require('../../services/token');

module.exports = function (router, ctrl) {
  router.route('/interaction/activity')
    .post(token.needToken, ctrl.v2_0.postInteractionValidate, ctrl.v2_0.postActivity)
    .get(token.needToken, ctrl.v2_0.getActivity);
  router.route('/interaction/poll')
    .post(token.needToken, ctrl.v2_0.postInteractionValidate, ctrl.v2_0.postPoll)
    .get(token.needToken, ctrl.v2_0.postInteractionValidate, ctrl.v2_0.getPoll);
  router.route('/interaction/question')
    .post(token.needToken, ctrl.v2_0.postInteractionValidate, ctrl.v2_0.postQuestion)
    .get(token.needToken, ctrl.v2_0.getQuestion);

  router.get('/interaction', token.needToken, ctrl.v2_0.getInteraction);

  router.get('/interaction/activity/{interactionId}', token.needToken, ctrl.v2_0.getActivitytDetail);
  router.get('/interaction/poll/{interactionId}', token.needToken, ctrl.v2_0.getPollDetail);
  router.get('/interaction/question/{interactionId}', token.needToken, ctrl.v2_0.getQuestionDetail);
};