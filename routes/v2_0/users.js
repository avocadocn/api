'use strict';

var token = require('../../services/token.js');
var getById = require('../../middlewares/getById.js');

module.exports = function (app, ctrl) {

  app.post('/users', ctrl.v1_3.getCompanyByCid, ctrl.v1_3.registerValidate, ctrl.v1_3.register);
  app.post('/users/validate', ctrl.v1_3.userInfoValidate);

  app.get('/users/:userId', token.needToken, ctrl.v1_3.getUserById);
  app.put('/users/:userId', token.needToken, getById.getUserById, ctrl.v1_3.updateValidate, ctrl.v1_3.updatePhoto, ctrl.v1_4.update);
  app.get('/users/list/:companyId', token.needToken, ctrl.v1_4.getCompanyUsers);
  app.post('/users/forgetPassword', ctrl.v1_3.forgetPassword);
  app.post('/users/sendFeedback', token.needToken, ctrl.v1_3.sendFeedback);
  app.post('/users/:userId/close', token.needToken, getById.getUserById, ctrl.v1_4.close);
  app.post('/users/:userId/open', token.needToken, getById.getUserById, ctrl.v1_4.open);
  app.post('/users/:userId/active', token.needToken, getById.getUserById, ctrl.v1_4.activeUser);
  app.post('/users/actions/invite', token.needToken, ctrl.v1_3.inviteUser);
  app.post('/users/actions/batchinvite', token.needToken, ctrl.v1_3.batchinviteUser);
  app.post('/users/login', ctrl.v1_3.login);
  app.post('/users/refresh/token', token.needToken, ctrl.v1_3.refreshToken);
  app.post('/users/logout', token.needToken, ctrl.v1_3.logout);

  app.get('/users/:userId/photos', token.needToken, ctrl.v1_3.getUserPhotosValidate, ctrl.v1_3.getUserPhotos);
  app.get('/users/:userId/comments', token.needToken, getById.getUserById, ctrl.v1_3.getUserComments);

  app.post('/users/resend/activeEmail', ctrl.v1_3.resendActiveEmail); // 重发激活邮件

  app.get('/users/concern/:userId', token.needToken, ctrl.v2_0.validateConcern ,ctrl.v2_0.getConcern); //获取我的关注列表
  app.post('/users/concern/:userId', token.needToken, ctrl.v2_0.addConcern); //对xx增加关注 
  app.delete('/users/concern/:userId', token.needToken, ctrl.v2_0.deleteConcern); //将xx从自己的关注列表中删除

};