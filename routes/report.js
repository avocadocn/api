'use strict';
var token = require('../services/token');
module.exports = function (app, ctrl) {

  app.post('/report',token.needToken, ctrl.pushReport);
};