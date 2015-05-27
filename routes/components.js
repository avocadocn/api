'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/components/ScoreBoard/:componentId', token.needToken, ctrl.ScoreBoard.setScoreValidate, ctrl.ScoreBoard.setScore);
  app.get('/components/ScoreBoard/:componentId', token.needToken, ctrl.ScoreBoard.getScore);
  app.get('/components/ScoreBoard/logs/:componentId', token.needToken, ctrl.ScoreBoard.getLogs);
  app.put('/components/ScoreBoard/:componentId',token.needToken, ctrl.ScoreBoard.confirmScore);
  app.post('/components/Vote/:componentId',token.needToken, ctrl.Vote.vote);
  app.del('/components/Vote/:componentId',token.needToken, ctrl.Vote.cancelVote);
  app.get('/components/Vote/:componentId',token.needToken, ctrl.Vote.getVote);
};