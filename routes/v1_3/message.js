'use strict';
var token = require('../../services/token');
module.exports = function (app, ctrl) {

  app.post('/messages', token.needToken, ctrl.v1_3.sendMessage);
  app.get('/messages', token.needToken, ctrl.v1_3.getMessageList);
  app.put('/messages', token.needToken, ctrl.v1_3.updateMessageList);

  app.get('/messages/:requestType/:requestId', token.needToken, ctrl.v1_3.receiveMessage);
  app.get('/messages/send/:requestType/:requestId', token.needToken, ctrl.v1_3.getSendMessage);
};