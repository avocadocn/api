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
  joinTeam: function (role) {
    if (role.company === 'member' && !role.team) {
      return true;
    } else {
      return false;
    }
  },
  quitTeam: {
    team: ['leader', 'member']
  },
  closeTeam: {
    company: ['hr']
  },
  createTeams:{
    company: ['hr', 'member']
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
  editCompany: {
    company: ['hr']
  },
  // 能操作某user加入小队
  joinTeamOperation: {
    company: ['hr'],
    user: ['self']
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

  // 上传照片
  uploadPhoto: {
    company: ['hr'],
    team: ['leader', 'member']
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
  }

};

module.exports = registeredTasks;