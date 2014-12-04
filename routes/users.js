'use strict';

var token = require('../services/token.js');
var getById = require('../middlewares/getById.js');

module.exports = function (app, ctrl) {

  app.post('/users', ctrl.getCompanyByCid, ctrl.registerValidate, ctrl.register);
  app.get('/users/:userId', token.needToken, ctrl.getUserById);

  app.post('/users/:userId/close', token.needToken, getById.getUserById, ctrl.close);
  app.post('/users/:userId/open', token.needToken, getById.getUserById, ctrl.open);

  app.post('/users/login', ctrl.login);
  app.post('/users/logout', token.needToken, ctrl.logout);
};