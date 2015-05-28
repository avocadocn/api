'use strict';

var token = require('../../services/token');

module.exports = function (app, ctrl) {

  app.post('/competition_messages', token.needToken, ctrl.v1_3.sendMessageValidate, ctrl.v1_3.createMessage);
  app.get('/competition_messages', token.needToken, ctrl.v1_3.getMessages.filter, ctrl.v1_3.getMessages.queryAndFormat);
  app.get('/competition_messages/:messageId', token.needToken, ctrl.v1_3.getMessage);
  app.put('/competition_messages/:messageId', token.needToken, ctrl.v1_3.dealValidate, ctrl.v1_3.dealCompetition);

};