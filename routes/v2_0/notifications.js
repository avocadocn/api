'use strict';

var token = require('../../services/token');

module.exports = function (router, ctrl) {
  router.use('/notifications', token.needToken);
  router.get('/notifications/:noticeType', ctrl.v2_0.getNotifications);   //获取自己的通知列表
};