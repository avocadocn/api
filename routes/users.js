'use strict';

var token = require('../middlewares/token.js');

module.exports = function (app, ctrl) {

  app.get('/users/:userId', token.needToken, ctrl.getUserById);

  app.post('/users/login', ctrl.login);

};