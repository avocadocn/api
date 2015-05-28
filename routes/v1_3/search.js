'use strict';

var token = require('../../services/token');

module.exports = function (app, ctrl) {
  app.post('/search/companies', ctrl.v1_3.searchCompanies);
  app.post('/search/users', token.needToken, ctrl.v1_3.searchUsers);
};