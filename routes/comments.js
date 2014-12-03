'use strict';

var token = require('../services/token');

module.exports = function (app, ctrl) {

  app.post('/comments', token.needToken,ctrl.canPublishComment, ctrl.createComments);

};