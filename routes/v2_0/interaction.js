'use strict';

var resources = require('../../resources/campaigns');
var token = require('../../services/token');
var auth = require('../../services/auth');
var getById  = require('../../middlewares/getById');

module.exports = function (app, ctrl) {

  app.post('/interaction/activity', token.needToken, ctrl.v2_0.postActivity);
  app.post('/interaction/poll', token.needToken, ctrl.v2_0.postPoll);
  app.post('/interaction/question', token.needToken, ctrl.v2_0.postQuestion);
};