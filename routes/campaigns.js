'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/campaigns', token.needToken, ctrl.postCampaign);
  app.get('/campaigns', token.needToken, ctrl.getCampaign);
  app.get('/campaigns/:campaignId',token.needToken, ctrl.getCampaignById);
  app.put('/campaigns/:campaignId',token.needToken, ctrl.updateCampaign);
  app.delete('/campaigns/:campaignId', token.needToken, ctrl.closeCampaign);
  app.post('/campaigns/:campaignId/users/:userId', token.needToken, ctrl.joinCampaign);
  app.delete('/campaigns/:campaignId/users/:userId', token.needToken, ctrl.quitCampaign);
};