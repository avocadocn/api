'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/components/ScoreBoard/:componentId', token.needToken, ctrl.ScoreBoard.setScoreValidate, ctrl.ScoreBoard.setScore);
  app.get('/components/ScoreBoard/:componentId', token.needToken, ctrl.ScoreBoard.getLogs);
  app.put('/components/ScoreBoard/:componentId',token.needToken, ctrl.ScoreBoard.confirmScore);
};