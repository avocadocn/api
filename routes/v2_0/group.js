'use strict';

var token = require('../../services/token.js');

module.exports = function(app, ctrl) {
  app.post('/groups', token.needToken, ctrl.v2_0.getFormDataForGroup, ctrl.v2_0.uploadLogoForGroup, ctrl.v2_0.createGroup); // 发新群组
  app.put('/groups/:groupId', token.needToken, ctrl.v2_0.validateAdmin, ctrl.v2_0.getGroupById, ctrl.v2_0.getFormDataForUpdateGroup, ctrl.v2_0.uploadLogoForGroup, ctrl.v2_0.updateGroup); // 编辑群组
  app.post('/groups/:groupId/invitation', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.inviteMemberToGroup); // app内群组邀请
  app.get('/groups/:groupId/invitation', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.getInviteCodeForGroup); // app外群组邀请(获取邀请链接)
  app.put('/groups/:groupId/user', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.joinGroup); // 加入群组
  app.delete('/groups/:groupId/user', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.quitGroup); // 退出群组
  app.delete('/groups/:groupId/user/:userId', token.needToken, ctrl.v2_0.validateLeader, ctrl.v2_0.getGroupById, ctrl.v2_0.removeMemberFromGroup); // 移除群组
  app.put('/groups/:groupId/user/:userId', token.needToken, ctrl.v2_0.validateLeader, ctrl.v2_0.getGroupById, ctrl.v2_0.reassignLeaderForGroup); // 指定新群主或管理员
  app.delete('/groups/:groupId', token.needToken, ctrl.v2_0.validateLeader, ctrl.v2_0.getGroupById, ctrl.v2_0.deleteGroup); // 删除群组
  app.get('/groups/search', token.needToken, ctrl.v2_0.searchGroup); // 搜索群组
  // 获取群组列表暂不合并，同时获取群组详情还需要根据项目实际情况进行改动
  app.get('/groups/list/user', token.needToken, ctrl.v2_0.getGroupListOfUser); // 获取个人群组列表
  app.get('/groups/list/company', token.needToken, ctrl.v2_0.getGroupListOfCompany); // 获取公司群组列表
  app.get('/groups/:groupId', token.needToken, ctrl.v2_0.getGroupInfo); // 获取群组信息

  app.put('/groups/:groupId/invitation', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.handleInvitationFromGroup); // 处理群组邀请
  app.put('/groups/:groupId/applicant/:userId', token.needToken, ctrl.v2_0.validateAdmin, ctrl.v2_0.getGroupById, ctrl.v2_0.handleApplication); // 处理用户申请

  app.post('/groups/:groupId/leader', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.validateSuperAdmin, ctrl.v2_0.addLeader); // 任命群主（仅限大使创建的认证群）
  app.post('/groups/:groupId/admin', token.needToken, ctrl.v2_0.validateLeader, ctrl.v2_0.getGroupById, ctrl.v2_0.addAdmin); // 添加管理员
  app.delete('/groups/:groupId/admin', token.needToken, ctrl.v2_0.validateLeader, ctrl.v2_0.getGroupById, ctrl.v2_0.removeAdmin); // 移除管理员
  app.post('/groups/:groupId/update', token.needToken, ctrl.v2_0.validateAdmin, ctrl.v2_0.getGroupById, ctrl.v2_0.requestUpdate); // 申请升级群
  app.put('/groups/:groupId/update', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.validateSuperAdmin, ctrl.v2_0.dealUpdate); // 处理升级群
  app.get('/groups/list/update', token.needToken, ctrl.v2_0.validateSuperAdmin, ctrl.v2_0.getUpdateList); // 获取申请升级的群
};
