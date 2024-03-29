'use strict';

var token = require('../../services/token.js');
var getById = require('../../middlewares/getById.js');
var multerService = require('../../middlewares/multerService.js');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var config = require('../../config/config');
var sessionMiddleware = session({
    store: new RedisStore(),
    resave: false,
    saveUninitialized: true,
    secret: config.token.secret,
    cookie: {
      maxAge: config.token.expires
    }
});

module.exports = function (app, ctrl) {

  app.post('/users', multerService.upload('/user/photo').single('photo'), ctrl.v2_0.getCompanyByCid, ctrl.v2_0.registerValidate, ctrl.v2_0.register);
  // app.post('/users', ctrl.v2_0.getFormData, ctrl.v2_0.getCompanyByCid, ctrl.v2_0.registerValidate, ctrl.v2_0.uploadPhotoForUser, ctrl.v2_0.register);
  app.post('/users/validate', ctrl.v2_0.userInfoValidate);
  app.get('/users/:userId', token.needToken, ctrl.v2_0.getUserById);
  app.put('/users/:userId', token.needToken, multerService.upload('/user/photo').single('photo'), ctrl.v2_0.updateValidate, ctrl.v2_0.update);
  app.get('/users/list/birthday', token.needToken ,ctrl.v2_0.getBirthDayUsers); //获取近期过生日的人
  app.get('/users/list/:companyId', token.needToken, ctrl.v2_0.getCompanyUsers);
  app.post('/users/forgetPassword', ctrl.v2_0.forgetPassword);
  app.post('/users/sendFeedback', token.needToken, multerService.upload('feedback').array('photos',9), ctrl.v2_0.sendFeedback);

  app.post('/users/:userId/close', token.needToken, getById.getUserById, ctrl.v2_0.validateSuperAdmin, ctrl.v2_0.close);
  app.post('/users/:userId/open', token.needToken, getById.getUserById, ctrl.v2_0.validateSuperAdmin, ctrl.v2_0.open);
  // app.post('/users/:userId/active', token.needToken, getById.getUserById, ctrl.v1_4.activeUser);
  app.post('/users/actions/invite', token.needToken, ctrl.v2_0.validatePhones, ctrl.v2_0.generateInviteUrl, ctrl.v2_0.inviteUser);
  // app.post('/users/actions/batchinvite', token.needToken, ctrl.v1_3.batchinviteUser); //批量邀请用户
  app.post('/users/login', sessionMiddleware, ctrl.v2_0.login);
  app.post('/users/adminlogin', sessionMiddleware, ctrl.v2_0.adminLogin); //大使登录
  app.post('/users/refresh/token', token.needToken, sessionMiddleware, ctrl.v2_0.refreshToken);
  app.post('/users/logout', token.needToken, sessionMiddleware, ctrl.v2_0.logout);

  // app.get('/users/:userId/photos', token.needToken, ctrl.v1_3.getUserPhotosValidate, ctrl.v1_3.getUserPhotos);
  // app.get('/users/:userId/comments', token.needToken, getById.getUserById, ctrl.v1_3.getUserComments);

  // app.post('/users/resend/activeEmail', ctrl.v1_3.resendActiveEmail); // 重发激活邮件

  app.get('/users/concern/:userId', token.needToken ,ctrl.v2_0.getConcern); //获取我的关注列表
  app.post('/users/concern/:userId', token.needToken, ctrl.v2_0.addConcern); //对xx增加关注 
  app.delete('/users/concern/:userId', token.needToken, ctrl.v2_0.deleteConcern); //将xx从自己的关注列表中删除

};