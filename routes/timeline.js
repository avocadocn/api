'use strict';
var token = require('../middlewares/token');
module.exports = function (app, ctrl) {

  app.get('/timeline/record/:requestType/:requestId',token.needToken, ctrl.getTimelineRecord);
  app.get('/timeline/data/:requesrType/:requestId', token.needToken, ctrl.getTimelineData);
};