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
  joinCompanyCampaign: {
    company: ['member']
  },
  joinTeamCampaign: {
    team: ['leader', 'member']
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
  uploadPhoto: {
    company: ['hr'],
    team: ['leader', 'member']
  },
  visitPhotoAlbum: {
    company: ['hr', 'member']
  },
  sponsorCampaign: {
    company: ['hr'],
    team: ['leader']
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
  editTeam: {
    company: ['hr'],
    team: ['leader']
  },
  // 发小队站内信
  publishTeamMessage: {
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
  }
};

module.exports = registeredTasks;