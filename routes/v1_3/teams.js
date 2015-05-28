'use strict';

var token = require('../../services/token.js');
var getById  = require('../../middlewares/getById');

module.exports = function (app, ctrl) {
  app.post('/teams', token.needToken, ctrl.v1_3.createTeams);
  app.get('/teams', token.needToken, ctrl.v1_3.getTeamsValidate, ctrl.v1_3.getTeamsSetQueryOptions, ctrl.v1_3.getTeams);
  app.get('/teams/:teamId', token.needToken, getById.getTeamById, ctrl.v1_3.getTeam);
  app.put('/teams/:teamId', token.needToken, getById.getTeamById, ctrl.v1_3.updateTeamLogo, ctrl.v1_3.editTeamData);
  // app.put('/teams/:teamId/update', token.needToken, getById.getTeamById, ctrl.v1_3.updatePersonalTeam);
  app.delete('/teams/:teamId', token.needToken, getById.getTeamById, ctrl.v1_3.deleteTeam);
  app.post('/teams/:teamId/actions/open', token.needToken, getById.getTeamById, ctrl.v1_3.openTeam);
  app.post('/teams/:teamId/family_photos', token.needToken, getById.getTeamById, ctrl.v1_3.uploadFamilyPhotos);
  app.get('/teams/:teamId/family_photos', token.needToken, getById.getTeamById, ctrl.v1_3.getFamilyPhotos);
  // app.put('/teams/:teamId/family_photos/:familyPhotoId', token.needToken, getById.getTeamById, ctrl.v1_3.toggleSelectFamilyPhoto);
  app.delete('/teams/:teamId/family_photos/:familyPhotoId', token.needToken, getById.getTeamById, ctrl.v1_3.deleteFamilyPhoto);
  app.put('/teams/:teamId/users/:userId', token.needToken, getById.getUserById, getById.getTeamById, ctrl.v1_3.joinTeam);
  app.delete('/teams/:teamId/users/:userId', token.needToken, getById.getUserById, getById.getTeamById, ctrl.v1_3.quitTeam);
  app.get('/teams/:teamId/tags', token.needToken, ctrl.v1_3.getTeamTags);
  app.get('/teams/:teamId/members', token.needToken, ctrl.v1_3.getMembers);
  app.get('/groups', ctrl.v1_3.getGroups);
  app.get('/teams/lead/list', token.needToken, ctrl.v1_3.getLedTeams);

  app.get('/teams/search/:type', token.needToken, ctrl.v1_3.getSearchTeamsOptions, ctrl.v1_3.getSearchTeams);
};