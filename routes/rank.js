'use strict';
var token = require('../services/token');
var getById  = require('../middlewares/getById');

module.exports = function (app, ctrl) {

  app.get('/rank',token.needToken, ctrl.getRank);
  app.get('/rank/company/:companyId', token.needToken, ctrl.getCompanyRank);
  app.get('/rank/team/:teamId', token.needToken, getById.getTeamById, ctrl.getTeamRank);
};