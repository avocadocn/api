'use strict';

var resources = require('../resources/campaigns');
var token = require('../services/token');
var auth = require('../services/auth');
var getById  = require('../middlewares/getById');

module.exports = function (app, ctrl) {

  app.post('/campaigns', token.needToken, ctrl.postCampaign);
  app.get('/campaigns', token.needToken, ctrl.getCampaigns.switcher, ctrl.getCampaigns.filter, ctrl.getCampaigns.getHolder, ctrl.getCampaigns.auth, ctrl.getCampaigns.queryAndFormat);
  app.get('/campaigns/:campaignId',token.needToken, resources.getCampaignByParamId, auth.authMiddleware(['getCampaigns']), ctrl.getCampaign);
  app.put('/campaigns/:campaignId',token.needToken, resources.getCampaignByParamId, ctrl.updateCampaign);
  app.del('/campaigns/:campaignId', token.needToken, resources.getCampaignByParamId, ctrl.closeCampaign);
  app.post('/campaigns/:campaignId/users/:userId', token.needToken, resources.getCampaignByParamId, ctrl.joinCampaign);
  app.del('/campaigns/:campaignId/users/:userId', token.needToken, resources.getCampaignByParamId, ctrl.quitCampaign);
  app.put('/campaigns/:campaignId/dealProvoke',token.needToken, resources.getCampaignByParamId, ctrl.dealProvoke);
  app.get('/campaigns/mold/:requestType/:requestId',token.needToken, ctrl.getCampaignMolds);
  app.get('/campaigns/competition/:fromTeamId/:targetTeamId', token.needToken, ctrl.getCompetitionOfTeams);
  app.get('/campaigns/competition/:teamId', token.needToken, getById.getTeamById, ctrl.getCompetitionOfCompanyWithTeam);
};