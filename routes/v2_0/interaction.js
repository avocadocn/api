'use strict';

var token = require('../../services/token');

module.exports = function (router, ctrl) {

  router.route('/interaction/:interactionType')
    .post(token.needToken, ctrl.v2_0.createInteractionValidate, ctrl.v2_0.createInteraction)
    .get(token.needToken, ctrl.v2_0.getInteraction);
  router.get('/interaction/:interactionType/:interactionId', token.needToken, ctrl.v2_0.getInteractionDetail);
  router.post('/interaction/poll/:interactionId/users/:userId', token.needToken, ctrl.v2_0.poll);
};