'use strict';
var token = require('../services/token');
module.exports = function (app, ctrl) {

  app.post('/messages', token.needToken, ctrl.sendMessage);
  app.get('/messages', token.needToken, ctrl.getMessageList);
  app.put('/messages', token.needToken, ctrl.updateMessageList);

  app.get('/messages/:requestType/:requestId', token.needToken, ctrl.receiveMessage);
  app.get('/messages/send/:requestType/:requestId', token.needToken, ctrl.getSendMessage);
};