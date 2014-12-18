'use strict';

module.exports = function (app, ctrl) {
  app.post('/search/companies', ctrl.searchCompanies);
};