'use strict';

var token = require('../../services/token.js');
var getById = require('../../middlewares/getById.js');

var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var config = require('../../config/config');

var sessionMiddleware = session({
    store: new RedisStore(),
    resave: false,
    saveUninitialized: true,
    secret: config.token.secret,
    cookie: {
      maxAge: config.token.expires
    }
});

module.exports = function (app, ctrl) {

  // app.post('/companies', ctrl.v1_3.registerValidate, ctrl.v1_3.register, ctrl.v1_3.registerSave);
  // app.post('/companies/quickRegister', ctrl.v2_0.quickRegisterValidate, ctrl.v2_0.uploadPhotoForUser, ctrl.v2_0.quickRegister);
  // app.post('/companies/quickRegisterTeams', ctrl.v1_3.quickRegisterTeams);
  
  app.get('/companies/:companyId', token.needToken, ctrl.v2_0.getCompany);

  // app.put('/companies/:companyId', token.needToken, ctrl.v1_3.getCompanyById, ctrl.v1_3.updateCompanyValidate, ctrl.v1_3.updateCompanyLogo, ctrl.v1_3.updateCompany);
  // app.put('/companies/:companyId/companyCover', token.needToken, ctrl.v1_3.getCompanyById, ctrl.v1_3.updateCompanyCover);
  
  // app.post('/companies/validate', ctrl.v1_3.companyInfoValidate);
  // app.post('/companies/forgetPassword', ctrl.v1_3.forgetPassword);
  // app.get('/companies/:companyId/undisposed', token.needToken, ctrl.v1_3.getCompanyUndisposed);
  // app.get('/companies/:companyId/statistics', token.needToken, ctrl.v1_3.getCompanyStatistics);
  // app.get('/companies/:companyId/charts', token.needToken, ctrl.v1_3.getCompanyCharts);
  // app.get('/companies/:companyId/members', token.needToken, ctrl.v1_3.getCompanyMembers);
  // app.get('/companies/:companyId/latestMembers', token.needToken, ctrl.v1_3.getLatestMembers);
  // app.get('/companies/:companyId/reportedMembers', token.needToken, ctrl.v2_0.validateSuperAdmin, ctrl.v1_3.getCompanyReportedMembers);
  // app.get('/companies/:companyId/departments', token.needToken, ctrl.v1_3.getCompanyDepartments);
  // app.get('/companies/:companyId/tags', token.needToken, ctrl.v1_3.getCompanyTags);
  // app.post('/companies/login', sessionMiddleware, ctrl.v1_3.login);
  // app.post('/companies/refresh/token', token.needToken, sessionMiddleware, ctrl.v1_3.refreshToken);
  // app.post('/companies/logout', token.needToken, sessionMiddleware, ctrl.v1_3.logout);
  // app.get('/companies/:companyId/hasLeader', token.needToken, ctrl.v1_3.hasLeader);
};

