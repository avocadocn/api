'use strict';
var token = require('../../services/token');
var getById  = require('../../middlewares/getById');

module.exports = function (app, ctrl) {

  app.get('/rank',token.needToken, ctrl.v1_3.getRank);
  // app.get('/rank/company/:companyId', token.needToken, ctrl.v1_3.getCompanyRank);
  app.get('/rank/team/:teamId', token.needToken, getById.getTeamById, ctrl.v1_3.getTeamRank);
  app.get('/rank/user', token.needToken, ctrl.v1_3.getUserTeamRank);
  app.post('/rank/update', token.needToken, ctrl.v1_3.update);
  // app.get('/rank/user/first', token.needToken, ctrl.v1_3.getUserFirstTeamRank);
};