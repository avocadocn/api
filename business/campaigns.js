'use strict';

var moment = require('moment');

var tools = require('../tools/tools.js');
var updateLatestPhotoService = require('../services/update_latestphotos');
var auth = require('../services/auth.js');
var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');

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
 * @param {Boolean} owner 发请求的用户
 *
 * @param {Function} callback 形式为function(err, campaign)，通过异步回调取得的活动，其相册照片为更新后的可靠数据
 * @return {Object} 返回处理后的活动
 */
exports.formatCampaign = function (campaign, owner, user, callback) {
  var now = new Date();

  var resCampaign = {
    '_id': campaign._id,
    'active': campaign.active,
    'confirm_status': campaign.confirm_status,
    'create_time': campaign.create_time,
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
    'components': campaign.components,
    'campaign_type': campaign.campaign_type,
    'is_start': campaign.start_time <= Date.now(),
    'is_end': campaign.end_time <= Date.now(),
    'circle_content_sum': campaign.circle_content_sum
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
  //只要获取自己的主体的活动时才去判断权限
  if(user._id.toString()==owner._id.toString()){
    var role = auth.getRole(owner, {
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
  }
  //不需要获取照片
  // var photos = updateLatestPhotoService.getLatestPhotos(campaign.photo_album, 10, function (err, photoList) {
  //   resCampaign.photo_album.photos = photoList;
  //   resCampaign.moreFlag = photoList.length > 10;
  //   
  // });
  // resCampaign.photo_album.photos = photos;
  // resCampaign.moreFlag = photos.length > 10;
  callback && callback(null, resCampaign);
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
      remind_text = '距离结束';
      var temp_end_time = new Date(end_time);
      var during = moment.duration(moment(now).diff(temp_end_time));
    } else {
      // 活动未开始
      start_flag = 0;
      remind_text = '距离开始';
    }
    var years = Math.abs(during.years());
    var months = Math.abs(during.months());
    var days = Math.floor(Math.abs(during.asDays()));
    var hours = Math.abs(during.hours());
    var minutes = Math.abs(during.minutes());
    var seconds = Math.abs(during.seconds());
    if (years >= 1) {
      time_text = years + '年';
    }
    else if (months >= 1) {
      time_text = months + '月';
    }
    else if (days >= 1) {
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

/**
 * 将活动数据转换为前端需要的格式的方法集合
 */
var formatterList = {
  managerList: function (campaigns, options, callback) {
    // hr活动管理中的活动列表信息
    var campaignsLength = campaigns.length;
    var formatCampaigns = [];
    for(var i=0; i<campaignsLength; i++) {
      var formatCampaign = {
        '_id': campaigns[i]._id,
        'unitId': campaigns[i].campaign_type===1 || campaigns[i].campaign_type>5? campaigns[i].cid[0]: campaigns[i].tid[0],
        'campaignType':campaigns[i].campaign_type,
        'theme': campaigns[i].theme,
        'startTime': campaigns[i].start_time,
        'endTime': campaigns[i].end_time,
        'memberNumber': campaigns[i].members.length,
        'active': campaigns[i].active
      };
      if(campaigns[i].start_time > new Date()) formatCampaign.status = '未开始';
      else if(campaigns[i].end_time < new Date()) formatCampaign.status = '已结束';
      else formatCampaign.status = '进行中';
      formatCampaigns.push(formatCampaign);
    }
    callback(null, formatCampaigns);
  },
  calendar: function (campaigns, options, callback) {
    var campaignsLength = campaigns.length;
    var formatCampaigns = [];
    for(var i=0; i<campaignsLength; i++) {
      var formatCampaign = {
        _id: campaigns[i]._id,
        campaignType:campaigns[i].campaign_type,
        start: new Date(campaigns[i].start_time).valueOf(),
        end: new Date(campaigns[i].end_time).valueOf(),
        class: 'event-info'
      };
      formatCampaigns.push(formatCampaign);
    }
    callback(null, formatCampaigns);
  }
};

/**
 * 根据需要获取的活动类型和结果类型返回权限判断任务列表
 * @param {Object} owner
 * @param {Array} attrs 需要查询的活动的附加属性，如已参加、正在进行等
 * @param {String} resultType
 * @return {Array}
 */
exports.getAuthTasks = function (owner, attrs, resultType) {
  var tasks = ['getCampaigns'];
  // 现在暂时没有其它相关的权限任务，直接使用通用的获取活动任务
  return tasks;
};

/**
 * 查询并将活动转换为需要的格式
 *  queryAndFormat({
 *    reqQuery: req.query,
 *    campaignOwner: req.campaignOwner,
 *    user: req.user
 *  }, function (err, data) {})
 * @param opts
 * @param callback
 */
exports.queryAndFormat = function (opts, callback) {
  var dbQueryOptions = {};
  var formatter = formatterList[opts.reqQuery.result];
  var formatterOptions;
  var dbQuery;

  var pageSize = 20;
  if (opts.reqQuery.limit) {
    pageSize = Number(opts.reqQuery.limit);
  }

  // var sortOptions = '-start_time -_id';
  // todo set custom sort
  var sortOptions = opts.reqQuery.sort + ' -_id';
  var setPagerOptions = function () {
    if(opts.reqQuery.to){
      dbQueryOptions.start_time = { '$lte': new Date(parseInt(opts.reqQuery.to)) };
    }
    if(opts.reqQuery.from){
      dbQueryOptions.end_time = { '$gte': new Date(parseInt(opts.reqQuery.from)) };
    }
    if (opts.reqQuery.page_id) {
      dbQueryOptions._id = { '$lte': opts.reqQuery.page_id };
    }
    // HR 活动状态筛选功能
    // opts.reqQuery.status 
    // 值     状态
    // 1     未开始
    // 2     进行中
    // 3     已结束
    // opts.reqQuery.statusType
    // 值     状态请求出处
    // 0       活动日历
    // 1       活动管理
    if(opts.reqQuery.status) {
      var index = opts.reqQuery.status;
      switch(index) {
        case '1':
          if(opts.reqQuery.statusType == '1') {
            dbQueryOptions.start_time = {'$gt': new Date()};
          } else {
            dbQueryOptions.$and = [{'start_time': {'$gt': new Date()}}, {'start_time': {'$lte': new Date(parseInt(opts.reqQuery.to))}}];
          }
          break;
        case '2':
          if (opts.reqQuery.statusType == '1') {
            dbQueryOptions.$and = [{'start_time': {'$lte': new Date()}}, {'end_time': {'$gte': new Date()}}];
          } else {
            dbQueryOptions.$and = [ {'start_time': {'$lte': new Date()}}, {'start_time': {'$lte': new Date(parseInt(opts.reqQuery.to))}}, {'end_time': {'$gte': new Date()}}, {'end_time': { '$gte': new Date(parseInt(opts.reqQuery.from))}}];
          }
          break;
        case '3':
          if(opts.reqQuery.statusType == '1') {
            dbQueryOptions.end_time = {'$lt': new Date()};
          } else {
            dbQueryOptions.$and = [{'end_time': {'$lt': new Date()}}, {'end_time': {'$gte': new Date(parseInt(opts.reqQuery.from))}}];
          }
          break;
      }
    }
  };

  // todo 根据campaignOwner和result等条件设置查询
  if (opts.campaignOwner.user) {
    // todo 查询用户的活动
  } else {
    // todo 查询公司或小队活动
    if (opts.campaignOwner.company && !opts.campaignOwner.teams) {
      dbQueryOptions.cid = opts.campaignOwner.company._id;
      if(!opts.reqQuery.attrs || opts.reqQuery.attrs.indexOf('allCampaign')===-1)//非HR取所有公司所有小队
        dbQueryOptions.campaign_type = 1;
    } else if (opts.campaignOwner.teams) {
      dbQueryOptions.tid = opts.campaignOwner.teams.map(function (team) { return team._id });
    }
    if(!opts.reqQuery.attrs || opts.reqQuery.attrs.indexOf('showClose')===-1)
      dbQueryOptions.active =  true;
    setPagerOptions();
    dbQuery = Campaign.find(dbQueryOptions).sort(sortOptions).limit(pageSize + 1);
  }

  dbQuery.exec()
    .then(function (campaigns) {
      var nextCampaign;
      if (campaigns.length > pageSize) {
        nextCampaign = campaigns[pageSize];
      }
      var plainCampaigns = campaigns.slice(0, pageSize).map(function (campaign) {
        return campaign.toObject({ virtuals: true });
      });
      formatter(plainCampaigns, formatterOptions, function (err, resCampaigns) {
        if (err) {
          callback(err);
        }
        else if(opts.reqQuery.result==='calendar') {
          callback(null, {success:1, result:resCampaigns});
        }
        else {
          callback(null, {
            campaigns: resCampaigns,
            hasNext: !!nextCampaign,
            nextId: nextCampaign ? nextCampaign.id : undefined
          });
        }
      });
    })
    .then(null, function (err) {
      callback(err);
    });

};

