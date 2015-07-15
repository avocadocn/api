'use strict';

var token = require('../../services/token');

module.exports = function (app, ctrl) {

  app.post('/components/ScoreBoard/:componentId', token.needToken, ctrl.v1_3.ScoreBoard.setScoreValidate, ctrl.v1_3.ScoreBoard.setScore);
  app.get('/components/ScoreBoard/:componentId', token.needToken, ctrl.v1_3.ScoreBoard.getScore);
  app.get('/components/ScoreBoard/logs/:componentId', token.needToken, ctrl.v1_3.ScoreBoard.getLogs);
  app.put('/components/ScoreBoard/:componentId',token.needToken, ctrl.v1_3.ScoreBoard.confirmScore);
  app.post('/components/Vote/:componentId',token.needToken, ctrl.v1_3.Vote.vote);
  app.delete('/components/Vote/:componentId',token.needToken, ctrl.v1_3.Vote.cancelVote);
  app.get('/components/Vote/:componentId',token.needToken, ctrl.v1_3.Vote.getVote);
};