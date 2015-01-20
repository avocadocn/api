'use strict';

var moment = require('moment');

var tools = require('../tools/tools.js');
var updateLatestPhotoService = require('../services/update_latestphotos');
var auth = require('../services/auth.js');

/**
 * 将活动数据结构转换为前端需要的形式，主要是添加开始结束及权限等标记
 * example:
 *  var resCampaign = formatCampaign(campaign, req.user, function (err, cbCampaign) {
 *    // do something
 *  });
 *  resCampaign: {
 *    _id: '',
 *    active: true,
 *    confirm_status: true,
 *    theme: '',
 *    content: '',
 *    member_max: 10,
 *    member_min: 0,
 *    members_count: 10,
 *    location: '',
 *    start_time: '2014-06-25T09:00:00.000Z'
 *    finish: false,
 *    end_time: '2014-06-25T09:00:00.000Z',
 *    deadline: '2014-06-25T09:00:00.000Z',
 *    comment_sum: 20,
 *    join_flag: true, // 是否参加
 *    due_flag: true, // 是否已经报名截止
 *    tags: ['t1', 't2'],
 *    campaign_mold: '足球',
 *    campaign_unit: [{
 *      company: {
 *        _id: '',
 *        name: '',
 *        logo: ''
 *      },
 *      team: {
 *        _id: '',
 *        name: '',
 *        logo: ''
 *      }, // 公司活动无此属性
 *      member: [{
 *        _id: '',
 *        nickname: '',
 *        photo: ''
 *      }],
 *      member_quit: [], // 数组元素对象结构和member一样
 *      start_confirm: false
 *    }],
 *    photo_album: {
 *      _id: '',
 *      photos: [{
 *        _id: '',
 *        upload_date: '2014-06-25T09:00:00.000Z',
 *        click: 0,
 *        width: 128,
 *        height: 128,
 *        name: '',
 *        upload_user: {
 *          _id: '',
 *          name: '',
 *          type: 'user'
 *        }
 *      }],
 *      name: '',
 *      moreFlag: true // 是否有更多照片
 *    },
 *    campaign_type: 2,
 *    is_start: true,
 *    is_end: false,
 *    start_flag: true,
 *    remind_text: '距离活动结束还有',
 *    time_text: '5小时',
 *    deadline_rest: '5小时30分',
 *    members: [''], // 所有成员的id
 *    allow: {
 *      quitCampaign: true,
 *      publishCampaignMessage: true,
 *      joinCompanyCampaign: true,
 *      joinTeamCampaign: true, // joinCompanyCampaign,joinTeamCampaign只会存在一个
 *      editCompanyCampaign: true,
 *      editTeamCampaign: true, // editCompanyCampaign,editTeamCampaign只会存在一个
 *      dealProvoke: true,
 *      quitProvoke: true
 *    }
 *  }
 * @param {Object} campaign mongoose.model('Campaign')定义的模型
 * @param {Object} user mongoose.model('User')定义的模型
 * @param {Function} callback 形式为function(err, campaign)，通过异步回调取得的活动，其相册照片为更新后的可靠数据
 * @return {Object} 返回处理后的活动
 */
exports.formatCampaign = function (campaign, user, callback) {
  var now = new Date();

  var resCampaign = {
    '_id': campaign._id,
    'active': campaign.active,
    'confirm_status': campaign.confirm_status,
    'theme': campaign.theme,
    'content': campaign.content ? campaign.content.replace(/<\/?[^>]*>/g, '') : '',
    'member_max': campaign.member_max,
    'member_min': campaign.member_min,
    'members_count': campaign.members.length,
    'location': campaign.location,
    'start_time': campaign.start_time,
    'finish': campaign.finish,
    'end_time': campaign.end_time,
    'deadline': campaign.deadline,
    'comment_sum': campaign.comment_sum,
    'join_flag': tools.arrayObjectIndexOf(campaign.members, user._id, '_id') > -1 ? 1 : -1,
    'due_flag': now > campaign.deadline ? 1 : 0,
    'tags': campaign.tags,
    'campaign_mold': campaign.campaign_mold,
    'campaign_unit': campaign.campaign_unit,
    'photo_album': {
      '_id': campaign.photo_album._id,
      'name': campaign.photo_album.name
    },
    'campaign_type': campaign.campaign_type,
    'is_start': campaign.start_time <= Date.now(),
    'is_end': campaign.end_time <= Date.now()
  };
  var _formatTime = formatTime(campaign.start_time, campaign.end_time);
  resCampaign.start_flag = _formatTime.start_flag;
  resCampaign.remind_text = _formatTime.remind_text;
  resCampaign.time_text = _formatTime.time_text;
  resCampaign.deadline_rest = formatRestTime(now, campaign.deadline);
  var memberIds = [];
  campaign.members.forEach(function (member) {
    memberIds.push(member._id);
  });
  var role = auth.getRole(user, {
    companies: campaign.cid,
    teams: campaign.tid,
    users: memberIds
  });
  if (campaign.confirm_status) {
    var joinTaskName = campaign.campaign_type == 1 ? 'joinCompanyCampaign' : 'joinTeamCampaign';
    var editTaskName = campaign.campaign_type == 1 ? 'editCompanyCampaign' : 'editTeamCampaign';
    var allow = auth.auth(role, [
      'quitCampaign', 'publishCampaignMessage', joinTaskName, editTaskName
    ]);
    if (campaign.deadline < now || (campaign.member_max > 0 && campaign.members.length >= campaign.member_max)) {
      allow[joinTaskName] = false;
    }
    if (campaign.deadline < now) {
      allow.quitCampaign = false;
    }
    if (campaign.start_time < now) {
      allow[editTaskName] = false;
    }
  }
  else {
    var allow = {};
    if (role.team == 'leader' && [4, 5, 7, 9].indexOf(campaign.campaign_type) > -1) {

      var provokeRole = auth.getRole(user, {
        companies: campaign.cid,
        teams: [campaign.tid[0]]
      });
      var provokeAllow = auth.auth(provokeRole, [
        'sponsorProvoke'
      ]);
      allow.quitProvoke = provokeAllow.sponsorProvoke;
      provokeRole = auth.getRole(user, {
        companies: campaign.cid,
        teams: [campaign.tid[1]]
      });
      provokeAllow = auth.auth(provokeRole, [
        'sponsorProvoke'
      ]);
      allow.dealProvoke = provokeAllow.sponsorProvoke;
    }
  }
  resCampaign.allow = allow;
  var photos = updateLatestPhotoService.getLatestPhotos(campaign.photo_album, 10, function (err, photoList) {
    resCampaign.photo_album.photos = photoList;
    resCampaign.moreFlag = photoList.length > 10;
    callback && callback(err, resCampaign);
  });
  resCampaign.photo_album.photos = photos;
  resCampaign.moreFlag = photos.length > 10;
  return resCampaign;

};

/**
 * 格式化距离开始时间还有多久
 * @param  {Date} start_time 活动开始时间
 * @param  {Date} end_time   活动结束时间
 * @return {Object}          start_flag:活动是否已经开始,
 remind_text:提示文字,
 time_text: 距离开始（结束）的时间
 */
var formatTime = exports.formatTime = function (start_time, end_time) {
  var remind_text, time_text, start_flag;
  var now = new Date();
  var diff_end = now - end_time;
  if (diff_end >= 0) {
    // 活动已结束
    remind_text = '活动已结束';
    time_text = '';
    start_flag = -1;
  } else {
    // 活动未结束
    var temp_start_time = new Date(start_time);
    var during = moment.duration(moment(now).diff(temp_start_time));
    // 活动已开始
    if (during >= 0) {
      start_flag = 1;
      remind_text = '距离活动结束还有';
      var temp_end_time = new Date(end_time);
      var during = moment.duration(moment(now).diff(temp_end_time));
      var years = Math.abs(during.years());
      var months = Math.abs(during.months());
      var days = Math.floor(Math.abs(during.asDays()));
      var hours = Math.abs(during.hours());
      var minutes = Math.abs(during.minutes());
      var seconds = Math.abs(during.seconds());

      temp_end_time.setHours(hours);
      temp_end_time.setMinutes(minutes);
      temp_end_time.setSeconds(seconds);
      if (days >= 1) {
        time_text = days + '天';
      }
      else if (hours >= 1) {
        time_text = hours + '时';
      }
      else if (minutes >= 1) {
        time_text = minutes + '分';
      }
      else {
        time_text = seconds + '秒';
      }
    } else {
      // 活动未开始
      var years = Math.abs(during.years());
      var months = Math.abs(during.months());
      var days = Math.floor(Math.abs(during.asDays()));
      var hours = Math.abs(during.hours());
      var minutes = Math.abs(during.minutes());
      var seconds = Math.abs(during.seconds());

      temp_start_time.setHours(hours);
      temp_start_time.setMinutes(minutes);
      temp_start_time.setSeconds(seconds);
      start_flag = 0;
      remind_text = '距离活动开始还有';
      if (days >= 1) {
        time_text = days + '天';
      }
      else if (hours >= 1) {
        time_text = hours + '时';
      }
      else if (minutes >= 1) {
        time_text = minutes + '分';
      }
      else {
        time_text = seconds + '秒';
      }

    }
  }
  return {
    start_flag: start_flag,
    remind_text: remind_text,
    time_text: time_text
  };
};

/**
 * 格式化两个时间距离还有多久
 * @param  {Date} start_time 开始时间
 * @param  {Date} end_time   结束时间
 * @return {String}          相差时间的中文格式化
 */
var formatRestTime = exports.formatRestTime = function (start_time, end_time) {
  var restTime;
  var temp_start_time = new Date(start_time);
  var temp_end_time = new Date(end_time);
  var during = moment.duration(moment(temp_end_time).diff(temp_start_time));
  var years = Math.abs(during.years());
  var months = Math.abs(during.months());
  var days = Math.floor(Math.abs(during.asDays()));
  var hours = Math.abs(during.hours());
  var minutes = Math.abs(during.minutes());
  var seconds = Math.abs(during.seconds());

  if (days >= 3) {
    restTime = days + '天';
  }
  else if (days >= 1) {
    restTime = days + '天' + (hours ? hours + '小时' : '');
  }
  else if (hours >= 1) {
    restTime = hours + '小时' + minutes + '分';
  }
  else {
    restTime = (minutes ? minutes + '分' : '' ) + seconds + '秒';
  }
  return restTime;
};