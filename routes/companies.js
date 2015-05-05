'use strict';

var token = require('../services/token.js');
var getById = require('../middlewares/getById.js');

var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var config = require('../config/config');

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

  app.post('/companies', ctrl.registerValidate, ctrl.register, ctrl.registerSave);

  app.get('/companies/:companyId', token.needToken, ctrl.getCompany);
  app.put('/companies/:companyId', token.needToken, ctrl.getCompanyById, ctrl.updateCompanyValidate, ctrl.updateCompanyLogo, ctrl.updateCompany);
  app.put('/companies/:companyId/companyCover', token.needToken, ctrl.getCompanyById, ctrl.updateCompanyCover);
  
  app.post('/companies/validate', ctrl.companyInfoValidate);
  app.post('/companies/forgetPassword', ctrl.forgetPassword);
  app.get('/companies/:companyId/undisposed', token.needToken, ctrl.getCompanyUndisposed);
  app.get('/companies/:companyId/statistics', token.needToken, ctrl.getCompanyStatistics);
  app.get('/companies/:companyId/charts', token.needToken, ctrl.getCompanyCharts);
  app.get('/companies/:companyId/members', token.needToken, ctrl.getCompanyMembers);
  app.get('/companies/:companyId/latestMembers', token.needToken, ctrl.getLatestMembers);
  app.get('/companies/:companyId/reportedMembers', token.needToken, ctrl.getCompanyReportedMembers);
  app.get('/companies/:companyId/departments', token.needToken, ctrl.getCompanyDepartments);
  app.get('/companies/:companyId/tags', token.needToken, ctrl.getCompanyTags);
  app.post('/companies/login', sessionMiddleware, ctrl.login);
  app.post('/companies/refresh/token', token.needToken, sessionMiddleware, ctrl.refreshToken);
  app.post('/companies/logout', token.needToken, sessionMiddleware, ctrl.logout);
  app.get('/companies/:companyId/hasLeader', token.needToken, ctrl.hasLeader);
};

