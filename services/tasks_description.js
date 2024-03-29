'use strict';

/**
 * 任务权限说明列表, 一个任务可以是一个方法，接受role参数，返回Boolean值；
 * 也可以是一个对象，例如example中的uploadPhoto，当公司角色是hr或member，或者小队角色是leader或member时都可以执行该任务
 * 允许的角色:
 * company: 'hr', 'other_hr', 'member', 'other_member'
 * team: 'leader', 'member'
 * user: 'self'
 * 未登录的用户没有角色
 * 
 * example:
 *  registeredTasks = {
 *    publishComment: function (role) {
 *      if (role.company === 'member') return true;
 *      else return false;
 *    },
 *    uploadPhoto: {
 *      company: ['hr', 'member'],
 *      team: ['leader', 'member']
 *    },
 *    deletePhoto: {
 *      company: ['hr'],
 *      team: ['leader'],
 *      user: ['self']
 *    }
 *  }
 * @type {Object}
 */
var registeredTasks = {
  publishComment: {
    company: ['member']
  },
  getScoreBoardScore: {
    company: ['hr','member']
  },
  setScoreBoardScore: {
    company: ['hr'],
    team: ['leader']
  },
  confirmScoreBoardScore: {
    company: ['hr'],
    team: ['leader']
  },
  getScoreBoardLogs: {
    company: ['hr'],
    team: ['leader']
  },
  getUserAllCampaignsForCalendar: {
    user: ['self']
  },
  joinCompanyCampaign: function (role) {
    if (!role.user && role.company=='member') {
      return true;
    } else {
      return false;
    }
  },
  joinTeamCampaign: function (role) {
    if (!role.user && (role.team=='leader' || role.team=='member')) {
      return true;
    } else {
      return false;
    }
  },
  quitCampaign: {
    user: ['self']
  },
  editTeamCampaign: {
    company: ['hr'],
    team: ['leader']
  },
  editCompanyCampaign: {
    company: ['hr']
  },
  cancelCampaign: {
    company: ['hr'],
    team: ['leader']
  },
  dealProvoke: {
    company: ['hr'],
    team: ['leader']
  },
  visitPhotoAlbum: {
    company: ['hr', 'member']
  },
  sponsorTeamCampaign: {
    company: ['hr'],
    team: ['leader']
  },
  sponsorCompanyCampaign: {
    company: ['hr']
  },
  getOneTeaminfo:{
    company:['hr']
  },
  getMyTeaminfo:{
    team:['leader', 'member']
  },
  searchSameCityTeam:{
    team:['leader', 'member']
  },
  sponsorProvoke: {
    company: ['hr'],
    team: ['leader']
  },
  getTeams:{
    company: ['hr', 'member']
  },
  joinTeam: function (role) {
    if (role.company === 'member' && !role.team) {
      return true;
    } else {
      return false;
    }
  },
  quitTeam: {
    team: ['member']
  },
  closeTeam: {
    company: ['hr']
  },
  createTeams:{
    company: ['hr']
    // company: ['hr', 'member'] 个人小队功能开放
  },
  editTeam: {
    company: ['hr'],
    team: ['leader']
  },
  getPrivateMessage: {
    user: ['self']
  },
  getSentMessage: {
    user: ['self']
  },
  updatePrivateMessage: {
    user: ['self']
  },
  // 发小队站内信
  publishTeamMessage: {
    company: ['hr'],
    team: ['leader']
  },
  publishCampaignMessage: {
    company: ['hr'],
    team: ['leader']
  },
  editGroupInfo:{
    company:['hr'],
    team:['leader']
  },
  //给队长发站内信
  recommandTeamToLeader:{
    team:['member']
  },
  // 编辑小队全家福（包括上传、选择、取消选择，删除）
  editTeamFamily: {
    company: ['hr'],
    team: ['leader']
  },
  getCampaigns: {
    company: ['member', 'hr']
  },

  // 获取用户的完整信息
  getUserCompleteData: {
    company: ['hr'],
    user: ['self']
  },

  // 获取用户的简略信息
  getUserBriefData: {
    company: ['hr', 'member'],
    user: ['self']
  },

  // 获取用户的最基本的信息，只包括_id, nickname, photo
  getUserMinData: {
    company: ['hr', 'member', 'other_hr', 'other_member'],
    user: ['self']
  },
  // 屏蔽用户
  closeUser: {
    company: ['hr']
  },

  // 解除屏蔽
  openUser: {
    company: ['hr']
  },
  editUser: {
    company: ['hr'],
    user: ['self']
  },
  // 激活用户(当发邮件失败时hr可直接激活)
  activeUser: {
    company: ['hr']
  },

  editCompany: {
    company: ['hr']
  },
  // 能操作某user加入小队
  joinTeamOperation: function(role) {
    if (role.company === 'member' && role.user ==='self' || role.company === 'hr')
      return true;
    else
      return false;
  },
  // 能操作某user退出小队
  quitTeamOperation: {
    company: ['hr'],
    user: ['self']
  },
  changeUserPushStatus: {
    user: ['self']
  },
  // 创建相册
  createPhotoAlbum: {
    company: ['hr'],
    team: ['leader']
  },

  // 获取相册数据
  getPhotoAlbum: {
    company: ['member', 'hr']
  },

  // 编辑相册
  editPhotoAlbum: {
    company: ['hr'],
    team: ['leader']
  },

  // 删除相册
  deletePhotoAlbum: {
    company: ['hr'],
    team: ['leader']
  },

  // 获取小队的相册列表
  getTeamPhotoAlbums: {
    company: ['member', 'hr']
  },

  // 获取相册的照片列表
  getPhotos: {
    company: ['member', 'hr']
  },

  // 获取单张照片详细数据
  getPhoto: {
    company: ['member', 'hr']
  },

  // 上传照片
  uploadPhoto: {
    company: ['hr', 'member']
  },

  // 修改照片
  editPhoto: {
    company: ['hr'],
    team: ['leader'],
    user: ['self']
  },

  // 删除照片
  deletePhoto: {
    company: ['hr'],
    team: ['leader'],
    user: ['self']
  },

  // 获取一个用户的所有照片
  getUserPhotos: {
    company: ['hr', 'member'],
    user: ['self']
  },
  // 升级个人小队
  updateTeam: {
    team: ['leader']
  },

  // 任命队长
  appointLeader: {
    company: ['hr']
  },

  deleteCircleContent: {
    user: ['self']
  },
  // 获取公司统计信息
  getCompanyStatistics: {
    company: ['hr']
  },

  createCircleComment: {
    company: ['member']
  },

  deleteCircleComment: {
    user: ['self']
  },
  
  updateGroup: {
    user: ['self']
  },

  inviteMemberToGroup: {
    group: ['member']
  },

  publishCompanyCircle: function(role) {
    if (role.user == 'self' && role.company == 'member') {
      return true;
    } else {
      return false;
    }
  },

  publishTeamCircle: function(role) {
    if (role.user == 'self' && (role.team == 'leader' || role.team == 'member')) {
      return true;
    } else {
      return false;
    }
  },

  getUserComments: {
    company: ['hr']
  },

  // 基本的部门操作：添加、修改、删除、任命管理员
  operateDepartment: {
    company: ['hr']
  },

  // 获取讨论组列表
  getChatRooms: {
    company: ['member']
  },
  // 获取小组的排行榜信息
  getTeamRank: {
    company: ['member']
  }
};

module.exports = registeredTasks;