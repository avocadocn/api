'use strict';
var token = require('../services/token');
module.exports = function (app, ctrl) {

  app.post('/report',token.needToken, ctrl.pushReport);
  //hr处理举报
  app.put('/report',token.needToken, ctrl.dealReport);
};