'use strict';

var token = require('../services/token.js');
var getById = require('../middlewares/getById.js');

module.exports = function (app, ctrl) {

  app.post('/companies', ctrl.registerValidate, ctrl.register, ctrl.registerSave);

  app.get('/companies/:companyId', token.needToken, ctrl.getCompany);
  app.put('/companies/:companyId', token.needToken, ctrl.getCompanyById, ctrl.updateCompanyValidate, ctrl.updateCompanyLogo, ctrl.updateCompany);

  app.post('/companies/validate', ctrl.companyInfoValidate);
  app.post('/companies/forgetPassword', ctrl.forgetPassword);
  app.get('/companies/:companyId/statistics', token.needToken, ctrl.getCompanyStatistics);
  app.get('/companies/:companyId/members', token.needToken, ctrl.getCompanyMembers);
  app.get('/companies/:companyId/departments', token.needToken, ctrl.getCompanyDepartments);
  app.get('/companies/:companyId/tags', token.needToken, ctrl.getCompanyTags);
  app.post('/companies/login', ctrl.login);
  app.post('/companies/logout', token.needToken, ctrl.logout);
};