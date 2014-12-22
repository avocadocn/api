'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign');
var tools = require('../tools/tools'),
    cache = require('../services/cache/Cache'),
    log = require('../services/error_log.js'),
    auth = require('../services/auth.js');
var moment = require('moment');


/**
 * 格式化距离开始时间还有多久
 * @param  {Date} start_time 活动开始时间
 * @param  {Date} end_time   活动结束时间
 * @return {Object}          start_flag:活动是否已经开始,
                              remind_text:提示文字,
                              time_text: 距离开始（结束）的时间
 */
var formatTime = function(start_time,end_time){
  var remind_text, time_text,start_flag;
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
      if(days>=1){
        time_text =  days + '天';
      }
      else if(hours>=1){
        time_text = hours + '小时';
      }
      else if(minutes>=1){
        time_text =  minutes + '分'  ;
      }
      else{
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
      if(days>=1){
        time_text =  days + '天';
      }
      else if(hours>=1){
        time_text = hours + '小时';
      }
      else if(minutes>=1){
        time_text =  minutes + '分'  ;
      }
      else{
        time_text = seconds + '秒';
      }

    }
  }
  return { start_flag:start_flag,
            remind_text:remind_text,
            time_text: time_text
          }
}
/**
 * 格式化两个时间距离还有多久
 * @param  {Date} start_time 开始时间
 * @param  {Date} end_time   结束时间
 * @return {String}          相差时间的中文格式化
 */
var formatrestTime = function(start_time,end_time){
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

  if(days>=3){
    restTime =  days + '天';
  }
  else if(days>=1){
    restTime = days + '天' + (hours ? hours + '小时' : '') ;
  }
  else if(hours>=1){
    restTime = hours + '小时'  + minutes + '分';
  }
  else{
    restTime = (minutes ?  minutes + '分' : '' ) + seconds + '秒';
  }
  return restTime;
}
/**
 * [formatCampaign description]
 * @param  {[type]} campaign [description]
 * @param  {[type]} role     [description]
 * @param  {[type]} user     [description]
 * @return {[type]}          [description]
 */
var formatCampaign = function(_campaign,user){
  var now = new Date();
  var temp = {
    '_id':_campaign._id,
    'active':_campaign.active,
    'confirm_status':_campaign.confirm_status,
    'theme':_campaign.theme,
    'content':_campaign.content ? _campaign.content.replace(/<\/?[^>]*>/g, ''):'',
    'member_max':_campaign.member_max,
    'members_count':_campaign.members.length,
    'location':_campaign.location,
    'start_time':_campaign.start_time,
    'finish':_campaign.finish,
    'end_time':_campaign.end_time,
    'deadline':_campaign.deadline,
    'comment_sum':_campaign.comment_sum,
    'join_flag':tools.arrayObjectIndexOf(_campaign.members,user._id,'_id')>-1?1:-1,
    'due_flag':now>_campaign.deadline ? 1 : 0,
    'tags':_campaign.tags,
    'campaign_mold':_campaign.campaign_mold,
    'campaign_unit':_campaign.campaign_unit,
    'photo_album':_campaign.photo_album,
    'campaign_type':_campaign.campaign_type,
    'is_start': _campaign.start_time <= Date.now(),
    'is_end': _campaign.end_time <= Date.now()
  };
  var _formatTime = formatTime(_campaign.start_time,_campaign.end_time);
  temp.start_flag = _formatTime.start_flag;
  temp.remind_text =_formatTime.remind_text;
  temp.time_text = _formatTime.time_text;
  temp.deadline_rest = formatrestTime(now,_campaign.deadline);
  var memberIds = [];
  _campaign.members.forEach(function (member) {
    memberIds.push(member._id);
  });
  //temp.components = _campaign.formatComponents();
  var role = auth.getRole(user, {
    companies: _campaign.cid,
    teams: _campaign.tid,
    users: memberIds
  });
  var joinTaskName = _campaign.campaign_type==1?'joinCompanyCampaign':'joinTeamCampaign';
  var allow = auth.auth(role, [
    'quitCampaign',joinTaskName
  ]);
  if (_campaign.deadline < now || (_campaign.member_max >0 && _campaign.members.length >= _campaign.member_max)) {
    allow[joinTaskName]=false;
  }
  if(role.team=='leader' && [4,5,7,9].indexOf(_campaign.campaign_type)>-1){
    var provokeRole = auth.getRole(user, {
      companies: _campaign.cid,
      teams: [_campaign.tid[0]]
    });
    var provokeAllow = auth.auth(provokeRole, [
      'sponsorProvoke'
    ]);
    allow.quitProvoke = provokeAllow.sponsorProvoke;
    allow.dealProvoke = !provokeAllow.sponsorProvoke;
  }

  temp.allow = allow;

  return temp;
};

module.exports = function (app) {

  return {

    getTimelineRecord: function (req, res) {
      var reqModel,
          requestType = req.params.requestType,
          requestId = req.params.requestId;
      switch(requestType){
        case 'company':
          reqModel = 'Company';
          requestId = req.params.requestId =='0' ?(req.user.cid.toString() || req.user._id.toString()) : req.params.requestId;
        break;
        case 'team':
          reqModel = 'CompanyGroup';
        break;
        case 'user':
          reqModel = 'User';
          requestId = req.params.requestId =='0' ?req.user._id : req.params.requestId;
        break;
        default:
        break;
      }
      mongoose.model(reqModel)
      .findById(requestId)
      .exec()
      .then(function(requestModal){
        var role = auth.getRole(req.user, {
          companies: [requestType=='company' ? requestId : requestModal.cid]
        });
        var allow = auth.auth(role, ['getCampaigns']);
        if(!allow.getCampaigns){
          return res.status(403).send('您没有权限获取该活动');
        }
        var cacheName,finishLimit='';
        var options ={
          'active':true
        };
        if(req.params.requestType=='team'){
          cacheName ='TeamPageCampaignDateRecord';
          options.tid = { $in: [mongoose.Types.ObjectId(requestId)] }
        }
        else if(req.params.requestType=='user'){
          cacheName ='UserPageCampaignDateRecord';
          options['campaign_unit.member._id'] = mongoose.Types.ObjectId(requestId);
          if(!req.query.unfinishFlag){
            options.finish=true;
            finishLimit ='1';
          }
        }
        else if(req.params.requestType=='company'){
          cacheName ='CompanyPageCampaignDateRecord';
          options['cid'] = mongoose.Types.ObjectId(requestId);
          if(!req.query.unfinishFlag){
            options.finish=true;
            finishLimit ='1';
          }
        }
        cache.createCache(cacheName);
        var dateRecord = cache.get(cacheName, requestId+finishLimit);
        if (dateRecord) {
          return res.status(200).send(dateRecord);
        } else {
          // 查找分页数据
          // todo 可能会有垃圾数据影响分组，需要清除
          Campaign
            .aggregate()
            .match(options)
            .group({
              _id: {
                year: { $year: '$start_time' },
                month: { $month: '$start_time' }
              }
            })
            .sort('-_id.year -_id.month')
            .exec()
            .then(function (results) {
              var dateRecord = [];
              results.forEach(function (result) {
                var found = false;
                var i;
                for (i = 0; i < dateRecord.length; i++) {
                  if (dateRecord[i].year === result._id.year) {
                    found = true;
                    break;
                  }
                }
                if (found) {
                  dateRecord[i].month.push({
                    month:result._id.month
                  });
                } else {
                  dateRecord.push({
                    year: result._id.year,
                    month: [{
                      month:result._id.month
                    }]
                  });
                }
              });
              // cache.set(cacheName, req.params.hostId, dateRecord);
              return res.status(200).send(dateRecord);
            })
            .then(null, function (err) {
              log(err);
              res.status(200).send({msg: '获取有活动的年月列表失败' });
            });
        }
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: err });
      });
    },
    getTimelineData: function(req, res) {
      var reqModel,
        requestType = req.params.requestType,
        requestId = req.params.requestId;
      switch(requestType){
        case 'company':
          reqModel = 'Company';
          requestId = req.params.requestId =='0' ?(req.user.cid || req.user._id) : req.params.requestId;
        break;
        case 'team':
          reqModel = 'CompanyGroup';
        break;
        case 'user':
          reqModel = 'User';
          requestId = req.params.requestId =='0' ?req.user._id : req.params.requestId;
        break;
        default:
        break;
      }
      mongoose.model(reqModel)
      .findById(requestId)
      .exec()
      .then(function(requestModal){
        var role = auth.getRole(req.user, {
          companies: [requestType=='company' ? requestId : requestModal.cid]
        });
        var allow = auth.auth(role, ['getCampaigns']);
        if(!allow.getCampaigns){
          return res.status(403).send('您没有权限获取该活动');
        }

        var now = new Date();
        var year = req.query.year || now.getFullYear();
        var month = req.query.month || now.getMonth();

        var thisMonth = new Date(year, month - 1);
        var nextMonth = new Date(year, month);
        var options ={
          start_time: { $gte: thisMonth, $lt: nextMonth },
          'active':true,
          'confirm_status': { '$ne': false } // 旧数据没有此属性，新数据默认为true
        };
        if(requestType=='team'){
          options.tid = mongoose.Types.ObjectId(requestId);
        }
        else if(requestType=='user'){
          options['campaign_unit.member._id'] = mongoose.Types.ObjectId(requestId);
        }
        else if(requestType=='company'){
          options['cid'] = mongoose.Types.ObjectId(requestId);
        }
        Campaign
        .find(options)
        .populate('photo_album')
        .sort('-start_time')
        .exec()
        .then(function (campaigns) {
          var timeLine = {
            year:year,
            month:month,
            campaigns:[]
          };
          campaigns.forEach(function(campaign) {
            // var _head,_logo,_name;
            // var ct = campaign.campaign_type;
            // var unitInfos = [];
            // //公司活动
            // if(ct===1){
            //   // _head = '公司活动';
            //   _logo = campaign.campaign_unit[0].company.logo;
            //   _name = campaign.campaign_unit[0].company.name
            // }
            // //多队
            // else if(ct!==6&&ct!==2){
            //   // _head = campaign.team[0].name +'对' + campaign.team[1].name +'的比赛';
            //   for(var i = 0;i<campaign.campaign_unit.length;i++){
            //     var index = tools.arrayObjectIndexOf(campaign.campaign_unit[i].member,requestId,'_id');
            //     if(index>-1){
            //       _logo = campaign.campaign_unit[i].team.logo;
            //       _name = campaign.campaign_unit[i].team.name;
            //       break;
            //     }
            //     unitInfos.push({
            //       name: campaign.campaign_unit[i].team.name,
            //       logo: campaign.campaign_unit[i].team.logo
            //     });
            //   }
            //   // _logo = tools.arrayObjectIndexOf(campaign.camp[0].member,uid,'uid')>-1 ?campaign.camp[0].logo :campaign.camp[1].logo;
            // }
            // //单队
            // else {
            //   // _head = campaign.compaign_unit.team.name + '活动';
            //   _logo = campaign.campaign_unit[0].team.logo;
            //   _name = campaign.campaign_unit[0].team.name;
            // }
            // var _endTime = new Date(campaign.end_time);
            // var _groupYear = _endTime.getFullYear();
            // var _groupMonth = _endTime.getMonth()+1;
            // var memberIds = [];
            // campaign.members.forEach(function (member) {
            //   memberIds.push(member._id);
            // });

            // var isJoin = false;
            // if (req.user && req.user.provider === 'user') {
            //   isJoin = !!campaign.whichUnit(req.user._id);
            // }

            // var tempObj = {
            //   id: campaign._id,
            //   head:campaign.theme,
            //   logo:_logo,
            //   name:_name,
            //   content: campaign.content,
            //   location: campaign.location,
            //   group_type: campaign.group_type,
            //   start_time: campaign.start_time,
            //   provoke:ct===4||ct===5||ct===7||ct===9,
            //   year: _groupYear,
            //   month:_groupMonth,
            //   comment_sum:campaign.comment_sum,
            //   isJoin: isJoin,
            //   isStart: campaign.start_time < Date.now(),
            //   isEnd: campaign.end_time < Date.now(),
            //   unitInfos: unitInfos,
            //   photo_list: campaign.photo_album
            // }
            // tempObj.components = campaign.formatComponents();
            // var allow = auth(req.user, {
            //   companies: campaign.cid,
            //   teams: campaign.tid,
            //   users: memberIds
            // }, [
            //   'publishComment'
            // ]);
            // tempObj.allow = allow;

            timeLine.campaigns.push(formatCampaign(campaign,req.user));
          });
          return res.status(200).send(timeLine);
        })
        .then(null, function (err) {
          console.log(err);
          res.status(400).send({ msg: '获取活动失败' });
        });
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: err });
      });
    },
    getTimeline: function(req, res) {

      var reqModel,
        requestType = req.params.requestType,
        requestId = req.params.requestId;
      switch(requestType){
        case 'company':
          reqModel = 'Company';
          requestId = req.params.requestId =='0' ?(req.user.cid || req.user._id) : req.params.requestId;
        break;
        case 'team':
          reqModel = 'CompanyGroup';
        break;
        case 'user':
          reqModel = 'User';
          requestId = req.params.requestId =='0' ?req.user._id : req.params.requestId;
        break;
        default:
        break;
      }
      mongoose.model(reqModel)
      .findById(requestId)
      .exec()
      .then(function(requestModal){
        var role = auth.getRole(req.user, {
          companies: [requestType=='company' ? requestId : requestModal.cid]
        });
        var allow = auth.auth(role, ['getCampaigns']);
        if(!allow.getCampaigns){
          return res.status(403).send('您没有权限获取该活动');
        }
        var options ={
          'active':true,
          'confirm_status': { '$ne': false } // 旧数据没有此属性，新数据默认为true
        };
        if(requestType=='team'){
          options.tid = mongoose.Types.ObjectId(requestId);
        }
        else if(requestType=='user'){
          options['campaign_unit.member._id'] = mongoose.Types.ObjectId(requestId);
        }
        else if(requestType=='company'){
          options['cid'] = mongoose.Types.ObjectId(requestId);
        }
        Campaign.paginate(options,
          parseInt(req.query.page) || 1,10,function(err,pageCount,results,itemCount) {
            if(err){
              log(err);
              res.status(400).send({ msg: '获取活动失败' });
            }
            else{
              var timeLine = [];
              results.forEach(function(campaign) {
                timeLine.push(formatCampaign(campaign,req.user));
              });
              return res.status(200).send(timeLine);
            }
          },{sortBy:{'start_time':-1}, populate: 'photo_album'});
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: err });
      });
    }
  };

};