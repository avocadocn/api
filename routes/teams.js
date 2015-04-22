'use strict';

var token = require('../services/token.js');
var getById  = require('../middlewares/getById');

module.exports = function (app, ctrl) {
  app.post('/teams', token.needToken, ctrl.createTeams);
  app.get('/teams', token.needToken, ctrl.getTeamsValidate, ctrl.getTeamsSetQueryOptions, ctrl.getTeams);
  app.get('/teams/:teamId', token.needToken, getById.getTeamById, ctrl.getTeam);
  app.put('/teams/:teamId', token.needToken, getById.getTeamById, ctrl.updateTeamLogo, ctrl.editTeamData);
  // app.put('/teams/:teamId/update', token.needToken, getById.getTeamById, ctrl.updatePersonalTeam);
  app.delete('/teams/:teamId', token.needToken, getById.getTeamById, ctrl.deleteTeam);
  app.post('/teams/:teamId/actions/open', token.needToken, getById.getTeamById, ctrl.openTeam);
  app.post('/teams/:teamId/family_photos', token.needToken, getById.getTeamById, ctrl.uploadFamilyPhotos);
  app.get('/teams/:teamId/family_photos', token.needToken, getById.getTeamById, ctrl.getFamilyPhotos);
  // app.put('/teams/:teamId/family_photos/:familyPhotoId', token.needToken, getById.getTeamById, ctrl.toggleSelectFamilyPhoto);
  app.delete('/teams/:teamId/family_photos/:familyPhotoId', token.needToken, getById.getTeamById, ctrl.deleteFamilyPhoto);
  app.put('/teams/:teamId/users/:userId', token.needToken, getById.getUserById, getById.getTeamById, ctrl.joinTeam);
  app.delete('/teams/:teamId/users/:userId', token.needToken, getById.getUserById, getById.getTeamById, ctrl.quitTeam);
  app.get('/teams/:teamId/tags', token.needToken, ctrl.getTeamTags);
  app.get('/teams/:teamId/members', token.needToken, ctrl.getMembers);
  app.get('/groups', token.needToken, ctrl.getGroups);
  app.get('/teams/lead/list', token.needToken, ctrl.getLedTeams);

  app.get('/teams/search/:type', token.needToken, ctrl.getSearchTeamsOptions, ctrl.getSearchTeams);
};