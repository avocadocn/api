'use strict';
var token = require('../services/token');
var getById  = require('../middlewares/getById');

module.exports = function (app, ctrl) {

  app.get('/rank',token.needToken, ctrl.getRank);
  // app.get('/rank/company/:companyId', token.needToken, ctrl.getCompanyRank);
  app.get('/rank/team/:teamId', token.needToken, getById.getTeamById, ctrl.getTeamRank);
  app.get('/rank/user', token.needToken, ctrl.getUserTeamRank);
  app.post('/rank/update', token.needToken, ctrl.update);
  // app.get('/rank/user/first', token.needToken, ctrl.getUserFirstTeamRank);
};