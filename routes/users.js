'use strict';

module.exports = function (app, ctrl) {

  app.get('/users/:userId', ctrl.getUserById);

  app.post('/users/login', ctrl.login);

};