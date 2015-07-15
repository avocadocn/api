'use strict';

var resources = require('../../resources/campaigns');
var token = require('../../services/token');
var auth = require('../../services/auth');
var getById  = require('../../middlewares/getById');

module.exports = function (app, ctrl) {

  app.post('/campaigns', token.needToken, ctrl.v1_3.postCampaign);
  app.get('/campaigns', token.needToken, ctrl.v1_4.getCampaigns.switcher, ctrl.v1_4.getCampaigns.filter, ctrl.v1_4.getCampaigns.getHolder, ctrl.v1_4.getCampaigns.auth, ctrl.v1_4.getCampaigns.queryAndFormat);
  app.get('/campaigns/:campaignId',token.needToken, resources.getCampaignByParamId, auth.authMiddleware(['getCampaigns']), ctrl.v1_3.getCampaign);
  app.put('/campaigns/:campaignId',token.needToken, resources.getCampaignByParamId, ctrl.v1_4.updateCampaign);
  app.delete('/campaigns/:campaignId', token.needToken, resources.getCampaignByParamId, ctrl.v1_4.closeCampaign);
  app.post('/campaigns/:campaignId/users/:userId', token.needToken, resources.getCampaignByParamId, ctrl.v1_4.joinCampaign);
  app.delete('/campaigns/:campaignId/users/:userId', token.needToken, resources.getCampaignByParamId, ctrl.v1_4.quitCampaign);
  app.put('/campaigns/:campaignId/dealProvoke',token.needToken, resources.getCampaignByParamId, ctrl.v1_3.dealProvoke);
  app.get('/campaigns/mold/:requestType/:requestId',token.needToken, ctrl.v1_3.getCampaignMolds);
  app.get('/campaigns/competition/:fromTeamId/:targetTeamId', token.needToken, ctrl.v1_3.getCompetitionOfTeams);
  app.get('/campaigns/competition/:teamId', token.needToken, getById.getTeamById, ctrl.v1_3.getCompetitionOfCompanyWithTeam);
};