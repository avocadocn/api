'use strict';

var token = require('../middlewares/token.js');

module.exports = function (app, ctrl) {

  app.get('/companies/:companyId', ctrl.getCompanyById);

  app.post('/companies/login', ctrl.login);
  app.post('/companies/logout', token.needToken, ctrl.logout);
};