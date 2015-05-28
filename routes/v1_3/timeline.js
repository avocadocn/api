'use strict';
var token = require('../../services/token');
module.exports = function (app, ctrl) {

  app.get('/timeline/record/:requestType/:requestId',token.needToken, ctrl.v1_3.getTimelineRecord);
  app.get('/timeline/data/:requestType/:requestId', token.needToken, ctrl.v1_3.getTimelineData);
  app.get('/timeline/:requestType/:requestId', token.needToken, ctrl.v1_3.getTimeline);
  
};