'use strict';
var token = require('../services/token');
module.exports = function (app, ctrl) {

  app.get('/rank',token.needToken, ctrl.getRank);
  // app.get('/rank/:teamId', token.needToken, ctrl.getTeamRank);
};