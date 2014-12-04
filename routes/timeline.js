'use strict';
var token = require('../services/token');
module.exports = function (app, ctrl) {

  app.get('/timeline/record/:requestType/:requestId',token.needToken, ctrl.getTimelineRecord);
  app.get('/timeline/data/:requestType/:requestId', token.needToken, ctrl.getTimelineData);
};