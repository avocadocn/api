'use strict';

var token = require('../../services/token.js');

module.exports = function(app, ctrl) {
  app.get('/billboard', ctrl.v2_0.getBillboard);//, ctrl.v2_0.getFormDataForGroup, ctrl.v2_0.uploadLogoForGroup, ctrl.v2_0.createGroup); // 获取公司内、公司外排行榜 
  app.get('/billboard/user', token.needToken);//, ctrl.v2_0.getGroupById, ctrl.v2_0.getFormDataForUpdateGroup, ctrl.v2_0.uploadLogoForGroup, ctrl.v2_0.updateGroup); // 获取榜单成员
};