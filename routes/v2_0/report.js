'use strict';
var token = require('../../services/token');
module.exports = function (app, ctrl) {

  app.post('/report',token.needToken, ctrl.v2_0.pushReport);
  //hr处理举报
  app.put('/report',token.needToken, ctrl.v2_0.dealReport);
};
