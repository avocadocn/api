'use strict';

var token = require('../../services/token');

module.exports = function (app, ctrl) {
  app.post('/search/companies', ctrl.v2_0.searchCompanies);
  app.get('/search/users', token.needToken, ctrl.v2_0.searchUsersByName);
};