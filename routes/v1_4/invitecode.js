'use strict';
var token = require('../../services/token');
module.exports = function (app, ctrl) {

  app.get('/invitecode', ctrl.v1_3.checkInviteCode);
};