'use strict';

var token = require('../services/token.js');

module.exports = function (app, ctrl) {

  app.post('/companies', ctrl.registerValidate, ctrl.register, ctrl.registerSave);
  app.get('/companies/:companyId', token.needToken, ctrl.getCompanyById);

  app.post('/companies/login', ctrl.login);
  app.post('/companies/logout', token.needToken, ctrl.logout);
};