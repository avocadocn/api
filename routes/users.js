'use strict';

var token = require('../services/token.js');
var getById = require('../middlewares/getById.js');

module.exports = function (app, ctrl) {

  app.post('/users', ctrl.getCompanyByCid, ctrl.registerValidate, ctrl.register);
  app.post('/users/validate', ctrl.userInfoValidate);
  app.get('/users/:userId', token.needToken, ctrl.getUserById);
  app.put('/users/:userId', token.needToken, getById.getUserById, ctrl.updateValidate, ctrl.updatePhoto, ctrl.update);
  app.get('/users/list/:companyId', token.needToken, ctrl.getCompanyUsers);
  app.post('/users/forgetPassword', ctrl.forgetPassword);
  app.post('/users/sendFeedback', token.needToken, ctrl.sendFeedback);
  app.post('/users/:userId/close', token.needToken, getById.getUserById, ctrl.close);
  app.post('/users/:userId/open', token.needToken, getById.getUserById, ctrl.open);
  app.post('/users/:userId/active', token.needToken, getById.getUserById, ctrl.activeUser);
  app.post('/users/actions/invite', token.needToken, ctrl.inviteUser);

  app.post('/users/login', ctrl.login);
  app.post('/users/logout', token.needToken, ctrl.logout);

  app.get('/users/:userId/photos', token.needToken, ctrl.getUserPhotosValidate, ctrl.getUserPhotos);
  app.get('/users/:userId/comments', token.needToken, getById.getUserById, ctrl.getUserComments);
};