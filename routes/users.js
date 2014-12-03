'use strict';

var token = require('../services/token.js');

module.exports = function (app, ctrl) {

  app.post('/users', ctrl.getCompanyByCid, ctrl.registerValidate, ctrl.register);
  app.get('/users/:userId', token.needToken, ctrl.getUserById);

  app.post('/users/login', ctrl.login);
  app.post('/users/logout', token.needToken, ctrl.logout);
};