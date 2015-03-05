'use strict';
var token = require('../services/token');
var getById  = require('../middlewares/getById');

module.exports = function (app, ctrl) {

  app.get('/rank',token.needToken, ctrl.getRank);
  app.get('/rank/:teamId', token.needToken, getById.getTeamById, ctrl.getTeamRank);
};