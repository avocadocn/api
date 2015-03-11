'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/competition_messages', token.needToken, ctrl.sendMessageValidate, ctrl.createMessage);
  app.get('/competition_messages', token.needToken, ctrl.getMessages.filter, ctrl.getMessages.queryAndFormat);
  app.put('/competition_messages/:messageId', token.needToken, ctrl.dealValidate, ctrl.dealCompetition);

};