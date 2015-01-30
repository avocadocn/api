'use strict';

var resources = require('../resources/campaigns');
var token = require('../services/token');
var auth = require('../services/auth');

module.exports = function (app, ctrl) {

  app.post('/campaigns', token.needToken, ctrl.postCampaign);
  //app.get('/campaigns', token.needToken, ctrl.getCampaignList);
  // todo 重构获取活动列表的api，重构完成后取代上面的get /campaigns
  app.get('/campaigns', token.needToken, ctrl.getCampaigns.switcher, ctrl.getCampaigns.filter, ctrl.getCampaigns.getHolder, ctrl.getCampaigns.auth, ctrl.getCampaigns.setOptions, ctrl.getCampaigns.queryAndFormat);
  // end
  app.get('/campaigns/:campaignId',token.needToken, resources.getCampaignByParamId, auth.authMiddleware(['getCampaigns']), ctrl.getCampaign);
  app.put('/campaigns/:campaignId',token.needToken, resources.getCampaignByParamId, ctrl.updateCampaign);
  app.delete('/campaigns/:campaignId', token.needToken, resources.getCampaignByParamId, ctrl.closeCampaign);
  app.post('/campaigns/:campaignId/users/:userId', token.needToken, resources.getCampaignByParamId, ctrl.joinCampaign);
  app.delete('/campaigns/:campaignId/users/:userId', token.needToken, resources.getCampaignByParamId, ctrl.quitCampaign);
  app.put('/campaigns/:campaignId/dealProvoke',token.needToken, resources.getCampaignByParamId, ctrl.dealProvoke);
  app.get('/campaigns/mold/:requestType/:requestId',token.needToken, ctrl.getCampaignMolds);
};