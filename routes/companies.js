'use strict';

module.exports = function (app, ctrl) {

  app.get('/companies/:companyId', ctrl.getCompanyById);

};