'use strict';

module.exports = function (app, ctrl) {

  app.post('/campaigns', ctrl.postCampaign);
  app.get('/campaigns', ctrl.getCampaign);
  app.get('/campaigns/:campaignId', ctrl.getCampaignById);
  app.put('/campaigns/:campaignId', ctrl.updateCampaign);
  app.delete('/campaigns/:campaignId', ctrl.closeCampaign);
};