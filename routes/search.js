'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {
  app.post('/search/companies', ctrl.searchCompanies);
  app.post('/search/users', token.needToken, ctrl.searchUsers);
};