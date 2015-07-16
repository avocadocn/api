'use strict';

var token = require('../../services/token.js');

module.exports = function(app, ctrl) {
	app.post('/groups', token.needToken, ctrl.v2_0.getFormDataForGroup, ctrl.v2_0.uploadLogoForGroup, ctrl.v2_0.createGroup); // 发新群组 
	app.put('/groups/:groupId', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.getFormDataForUpdateGroup, ctrl.v2_0.uploadLogoForGroup, ctrl.v2_0.updateGroup); // 编辑群组
	app.post('/groups/:groupId/invite', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.inviteMemberToGroup); // 群组邀请
	app.put('/groups/:groupId/joinGroup', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.joinGroup); // 加入群组
	app.delete('/groups/:groupId/quitGroup', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.quitGroup); // 退出群组
	app.delete('/groups/:groupId/user/:userId', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.removeMemberFromGroup); // 移除群组
	app.put('/groups/:groupId/user/:userId', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.reassignLeaderForGroup); // 指定新群主
	app.delete('/groups/:groupId', token.needToken, ctrl.v2_0.getGroupById, ctrl.v2_0.deleteGroup); // 删除群组
	// app.get('/groups/search', token.needToken, ctrl.v2_0.searchGroup); // 搜索群组
	app.get('/groups/list/user', token.needToken, ctrl.v2_0.getGroupListOfUser); // 获取个人群组列表
	app.get('/groups/list/company', token.needToken, ctrl.v2_0.getGroupListOfCompany); // 获取公司群组列表
	app.get('/groups/:groupId', token.needToken, ctrl.v2_0.getGroupInfo); // 获取群组详情
};