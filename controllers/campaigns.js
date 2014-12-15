'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    CampaignMold = mongoose.model('CampaignMold'),
    User = mongoose.model('User'),
    CompanyGroup = mongoose.model('CompanyGroup');
var moment = require('moment'),
    async = require('async'),
    xss = require('xss');
var logController = require('../controllers/log'),
    messageController = require('../controllers/message'),
    pushContoller = require('../controllers/push'),
    auth = require('../services/auth.js'),
    donlerValidator = require('../services/donler_validator.js'),
    log = require('../services/error_log.js'),
    tools = require('../tools/tools.js');


var searchCampaign = function(select_type, option, sort, limit, requestId, teamIds, populate, callback){
  var now = new Date();
  var _option = {}; 
  for (var attr in option){
    _option[attr] = option[attr];
  }
  var populate = populate.split(',').join(' ');
  switch(select_type){
    //全部
    case '0':
      return callback(err,[]);
    break;
    //即将开始的活动
    case '1':
      _option.start_time = { '$gte':now };
      _option['campaign_unit.member._id'] = requestId;
    break;
    //正在进行的活动
    case '2':
      _option.start_time = { '$lt':now };
      _option.end_time = { '$gte':now };
      _option['campaign_unit.member._id'] = requestId;
    break;
    //已经结束的活动
    case '3':
      _option.end_time = { '$lte':now };
      _option['campaign_unit.member._id'] = requestId;
    break;
    //新活动（未参加）
    case '4':
      _option.deadline = { '$gte':now };
      _option['$or'] = [{'tid':{'$in':teamIds}},{'tid':{'$size':0}}];
      _option['$nor'] = [{'campaign_unit.member._id':requestId}];
    break;
    //未确认的挑战
    case '5':
      _option.confirm_status = false;
      _option.start_time = { '$gte': now};
      _option.campaign_type = {'$in':[4,5,7,9]};
      _option.tid = {'$in':teamIds}
    break;
    default:
    break;
  }
  Campaign
  .find(_option)
  .sort(sort)
  .limit(limit)
  .populate(populate)
  .exec()
  .then(function (campaign) {
    callback(null,campaign)
  })
  .then(null, function (err) {
    callback(err,[]);
  });
}
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
    'campaign_type':_campaign.campaign_type
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
  temp.components = _campaign.formatComponents();
  var role = auth.getRole(user, {
    companies: _campaign.cid,
    teams: _campaign.tid,
    users: memberIds
  });
  var joinTaskName = _campaign.campaign_type==1?'joinCompanyCampaign':'joinTeamCampaign';
  var allow = auth.auth(role, [
    'publishComment','quitCampaign',joinTaskName
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

    postCampaign: function (req, res) {
      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required']
        },
        campaign_type: {
          name: '活动类型',
          value: req.body.campaign_type,
          validators: ['required', 'number']
        },
        tid: {
          name: '小队tid',
          value: req.body.nickname,
          validators: req.body.campaign_type ==1 ? []:['required']
        },
        theme: {
          name: '主题',
          value: req.body.theme,
          validators: ['required',  donlerValidator.maxLength(14)]
        },
        location: {
          name: '活动位置',
          value: req.body.location,
          validators: ['required']
        },
        campaign_mold: {
          name: '活动模型',
          value: req.body.campaign_mold,
          validators: ['required']
        },
        start_time: {
          name: '开始时间',
          value: req.body.start_time,
          validators: [donlerValidator.after(new Date())]
        },
        end_time: {
          name: '结束时间',
          value: req.body.end_time,
          validators: [donlerValidator.after(req.body.start_time)]
        }
      }, 'complete', function (pass, msg) {
        if (!pass) {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
          return;
        }

        var role = auth.getRole(req.user, {
          companies: [req.body.cid[0]],
          teams: req.body.tid ? [req.body.tid[0]]:[]
        });
        var taskName = req.body.campaign_type == 1 ? 'sponsorCompanyCampaign': 'sponsorTeamCampaign';
        var allow = auth.auth(role, [taskName]);
        if(!allow[taskName]){
          return res.status(403).send('您没有权限发布该活动');
        }
        var campaign = new Campaign();
        campaign.active = true;
        for (var attr in req.body) {
          campaign[attr] = req.body[attr];
        }
        var _user={
          '_id':campaign.poster.uid||campaign.poster.cid,
          'name':campaign.poster.uid ? campaign.poster.nickname:campaign.poster.cname,
          'type':campaign.poster.uid ? 'hr':'user'
        };
        var photoInfo= {
          owner: {
            model: {
              // _id: campaign._id,
              type: 'Campaign'
            },
            companies: campaign.cid,
            teams:  campaign.tid,
          },
          name: moment(campaign.start_time).format("YYYY-MM-DD ") + campaign.theme,
          update_user:_user,
          create_user:_user
        };
        //---Photo
        var photo_album = new PhotoAlbum();
        for (var attr in photoInfo){
          photo_album[attr]=photoInfo[attr];
        }
        photo_album.owner.model._id=campaign._id;

        //---save

        photo_album.save(function(err) {
          if(err) return res.status(500).send('保存相册失败');
          campaign.photo_album = photo_album._id;

          campaign.components = [];
          campaign.modularization = true;
          var componentNames = [];
          CampaignMold.findOne({'name':campaign.campaign_mold},function(err,mold){
            if(err) return res.status(500).send('查找活动类型失败');
            else{
              componentNames = mold.module;
              if(campaign.campaign_unit.length!==2){//单组去除比分板
                var scoreIndex = componentNames.indexOf('ScoreBoard');
                if(scoreIndex>-1)
                  componentNames.splice(scoreIndex,1);
              }
              async.map(componentNames, function (componentName, asyncCallback) {
                mongoose.model(componentName).establish(campaign, function (err, component) {
                  if (err) { asyncCallback(err); }
                  else {
                    campaign.components.push({
                      name: componentName,
                      _id: component._id
                    });
                    asyncCallback(null, component);
                  }
                });
              }, function (err, results) {
                if (err) { return res.status(500).send('创建活动组件失败'); }
                else {
                  campaign.save(function(err) {
                    if(err) return res.status(500).send('保存活动失败');
                    else {
                      return res.status(200).send({'campaign_id':campaign._id,'photo_album_id':photo_album._id});
                    }

                  });

                }
              });
            }
          });
        });
      });
      
    },
    getCampaign: function (req, res) {
      var option,
          requestType = req.query.requestType,
          requestId = req.query.requestId,
          sort = req.query.sortBy || 'start_time',
          limit = parseInt(req.query.limit) || 0,
          populate =req.query.populate || '',
          reqModel,team_ids;
      switch(requestType){
        case 'company':
          reqModel = 'Company';
        break;
        case 'team':
          reqModel = 'CompanyGroup';
        break;
        case 'user':
          reqModel = 'User';
        break;
        default:
        break;
      }
      mongoose.model(reqModel)
      .findById(requestId)
      .exec()
      .then(function(requestModal){
        if(!requestModal){
          return res.status(404).send('未找到该活动');
        }
        var role = auth.getRole(req.user, {
          companies: [requestType=='company' ? requestId : requestModal.cid],
          teams:[requestType=='team' ? requestId : ''],
          users:[requestType=='user' ? requestId : '']
        });
        var allow = auth.auth(role, ['getCampaigns']);
        if(!allow.getCampaigns){
          return res.status(403).send('您没有权限获取该活动');
        }
        switch(requestType){
          case 'company':
            option = {
              'active':true,
              'cid' : requestId
            };
          break;
          case 'team':
            option = {
              'active':true,
              'cid':requestModal.cid,
              'tid':requestId
            };
          break;
          case 'user':
            team_ids = [];
            for( var i = requestModal.team.length-1; i >=0 ; i--) {
              team_ids.push(requestModal.team[i]._id.toString());
            }
            option={
              'active':true,
              'cid': requestModal.cid
            }
            if(req.query.join_flag=='1'){
              option['campaign_unit.member._id'] = requestId;
            }
            else if (req.query.join_flag=='0') {
              option['$or'] = [{'tid':{'$in':team_ids}},{'tid':{'$size':0}}];
            }
          break;
          default:
          break;
        }
        if(req.query.to){
          option.start_time = { '$lte':new Date(parseInt(req.query.to)) };
        }
        if(req.query.from){
          option.end_time = { '$gte':new Date(parseInt(req.query.from)) };
        }

        if(req.query.select_type =='0'){
          async.series([
            function(callback){
              searchCampaign('1', option, sort, limit, requestId, team_ids, populate, callback);
            },//即将开始的活动
            function(callback){
              searchCampaign('2', option, sort, limit, requestId, team_ids, populate, callback);
            },//正在进行的活动
            function(callback){
              searchCampaign('4', option, sort, limit, requestId, team_ids, populate, callback);
            },//新活动（未参加）
            function(callback){
              searchCampaign('5', option, sort, limit, requestId, team_ids, populate, callback);
            }//未确认的挑战
          ],function(err, values){
            if(err){
              log(err);
              return res.status(500).send({ msg: '服务器错误'});
            }
            else{
              var formatCampaigns = [];
              values.forEach(function(value){
                formatCampaigns.push([]);
                var index = formatCampaigns.length-1;
                value.forEach(function(campaign){
                  formatCampaigns[index].push(formatCampaign(campaign,req.user));
                })
        
              })
              return res.status(200).send(formatCampaigns);
            }
          });
        }
        else {
          searchCampaign(req.query.select_type, option, sort, limit, function(err, campaigns) {
            if(err) {
              res.status(500).send('服务器错误');
            }
            else if (!campaign) {
              res.status(404).send('未找到活动');
            }
            else{
              var formatCampaigns = [];
              campaigns.forEach(function(campaign){
                formatCampaigns.push(formatCampaign(campaign,req.user));
              })
              res.status(200).send(formatCampaigns);
            }
          });
        }
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: err });
      });
    },
    getCampaignById: function (req, res) {
      var populate = req.query.populate ? req.query.populate.split(',').join(' ') : '';
      Campaign
      .findById(req.params.campaignId)
      .populate(populate)
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动')
        }
        else{
          var role = auth.getRole(req.user, {
            companies: campaign.cid
          });
          var allow = auth.auth(role, ['getCampaigns']);
          if(!allow.getCampaigns){
            return res.status(403).send('您没有权限获取该活动');
          }
          res.status(200).send(formatCampaign(campaign,req.user));
        }
      })
      .then(null, function (err) {
        res.status(500).send('服务器错误');
      });
    },
    updateCampaign: function (req, res) {
      Campaign
      .findById(req.params.campaignId)
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动')
        }
        else{
          var role = auth.getRole(req.user, {
            companies: campaign.cid,
            teams: campaign.tid
          });
          var taskName = campaign.campaign_type==1?'editCompanyCampaign':'editTeamCampaign';
          var allow = auth.auth(role, [taskName]);
          if(!allow[taskName]){
            return res.status(403).send('您没有权限获取该活动');
          }
          if (req.body.content) {
            campaign.content=xss(req.body.content);
          }
          var max = Number(req.body.member_max);
          if (!isNaN(max)) {
            campaign.member_max = max;
          }
          var min = Number(req.body.member_min);
          if (!isNaN(min)) {
            campaign.member_min = min;
          }
          if(req.body.tags) {
            campaign.tags = req.body.tags;
          }
          if(req.body.deadline) {
            campaign.deadline = req.body.deadline;
          }
          campaign.save(function (err) {
            if (err) {
              return res.status(500).send('数据保存错误');
            } else {
              return res.status(200).send(campaign);
            }
          });
        }
      })
      .then(null, function (err) {
        res.status(500).send('服务器错误');
      });
    },
    closeCampaign: function (req, res) {
      Campaign
      .findById(req.params.campaignId)
      .exec()
      .then(function (campaign) {
        if (!campaign || campaign.active) {
          res.status(404).send('未找到可以关闭的活动')
        }
        else{
          var role = auth.getRole(req.user, {
            companies: campaign.cid,
            teams: campaign.tid
          });
          var taskName = campaign.campaign_type==1?'editCompanyCampaign':'editTeamCampaign';
          var allow = auth.auth(role, [taskName]);
          if(!allow[taskName]){
            return res.status(403).send('您没有权限获取该活动');
          }
          campaign.active = false;
          campaign.save(function (err) {
            if (err) {
              return res.status(500).send('关闭活动失败');
            } else {
              return res.send({ result: 1, msg: '关闭活动成功' });
            }
          });
        }
      })
      .then(null, function (err) {
        res.status(500).send('服务器错误');
      });
    },
    joinCampaign: function(req, res){
      Campaign
      .findById(req.params.campaignId)
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动');
        }
        else{
          var role = auth.getRole(req.user, {
            companies: campaign.cid,
            teams: campaign.tid,
            users:campaign.member
          });
          var taskName = campaign.campaign_type==1?'joinCompanyCampaign':'joinTeamCampaign';
          var allow = auth.auth(role, [taskName]);
          if(!allow[taskName]){
            return res.status(403).send('您没有权限参加该活动');
          }
          User.findById(req.params.userId)
          .exec()
          .then(function(user){

            if (campaign.deadline < Date.now()) {
              return req.status(400).send({
                msg: '活动报名已经截止'
              });
            }

            if (campaign.member_max > 0) {
              if (campaign.members.length >= campaign.member_max) {
                return req.status(400).send({
                  msg: '报名人数已达上限'
                });
              }
            }
            var _join = function (unit) {
              // 更新user的讨论列表
              var campaignIndex = tools.arrayObjectIndexOf(user.unjoinedCommentCampaigns,campaign._id,'_id');
              if(campaignIndex>-1){
                var campaignNeedUpdate = user.unjoinedCommentCampaigns.splice(campaignIndex,1);
                user.commentCampaigns.push(campaignNeedUpdate[0]);
                user.save(function (err) {
                  if (err)
                    console.log(err);
                });
              }

              for (var i = 0; i < unit.member_quit.length; i++) {
                if (user._id.toString() === unit.member_quit[i]._id.toString()) {
                  var member = (unit.member_quit.splice(i, 1))[0];
                  unit.member.push(member);
                  return {
                    success: true
                  };
                }
              }

              // 用户没有参加
              unit.member.push({
                _id: user._id,
                nickname: user.nickname,
                photo: user.photo
              });
              return {
                success: true
              };
            };
            var joinResult = {
              success: false,
              msg: '没有找到目标阵营'
            };
            for (var i = 0; i < campaign.campaign_unit.length; i++) {
              var unit = campaign.campaign_unit[i];
              // 非公司活动
              if (req.query.teamId) {
                if(req.query.teamId.toString() === unit.team._id.toString()){
                  joinResult = _join(unit);
                  break;
                }
              }
              // 公司活动
              else if (user.cid.toString() === unit.company._id.toString()) {
                joinResult = _join(unit);
                break;
              }
            }

            if (!joinResult.success) {
              return res.status(400).send({msg: joinResult.msg});
            } else {
              campaign.save(function (err) {
                if (err) {
                  log(err);
                  return req.status(400).send({
                    msg: '参加失败，请重试'
                  });
                } else {
                  var logBody = {
                    'log_type':'joinCampaign',
                    'userid' : user._id,
                    'cid': user.cid,
                    'role' : 'user',
                    'campaignid' :campaign._id
                  }
                logController.addLog(logBody);
                  return res.status(200).send(formatCampaign(campaign,req.user));
                }
              });
            }
          })
          .then(null, function (err) {
            log(err)
            res.status(500).send('服务器错误');
          });
        };
      })
      .then(null, function (err) {
        log(err)
        res.status(500).send('服务器错误');
      });
    },
    quitCampaign: function(req,res){
      var role = auth.getRole(req.user, {
        users: [req.params.userId]
      });
      var allow = auth.auth(role, ['quitCampaign']);
      if(!allow.quitCampaign){
        return res.status(403).send('您没有权限退出该活动');
      }
      Campaign
      .findById(req.params.campaignId)
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动');
        }
        else{
          User.findById(req.params.userId)
          .exec()
          .then(function(user){
            if (campaign.end_time < Date.now()) {
              return req.status(400).send({
                msg: '活动已经结束'
              });
            }
            var quitResult = false;
            var _quit = function (unit) {
              for (var i = 0; i < unit.member.length; i++) {
                if (req.params.userId === unit.member[i]._id.toString()) {
                  var member = (unit.member.splice(i, 1))[0];
                  if (!unit.member_quit) {
                    unit.member_quit = [];
                  }
                  unit.member_quit.push(member);

                  //
                  var campaignIndex = tools.arrayObjectIndexOf(user.commentCampaigns,campaign._id,'_id');
                  if(campaignIndex > -1){
                    var campaignNeedUpdate = user.commentCampaigns.splice(campaignIndex,1);
                    user.unjoinedCommentCampaigns.push(campaignNeedUpdate[0]);
                    user.save(function (err) {
                      if (err)
                        console.log(err);
                    });
                  }
                  return true;
                }
              }
              return false;
            };

            for (var i = 0; i < campaign.campaign_unit.length; i++) {
              var unit = campaign.campaign_unit[i];
              if (_quit(unit)) {
                quitResult = true;
              }
            }
            if (!quitResult) {
              return res.status(400).send({msg:'该成员未参加活动'});
            } else {
              campaign.save(function (err) {
                if (err) {
                  log(err);
                  return req.status(400).send({
                    msg: '退出失败，请重试'
                  });
                } else {
                  var logBody = {
                  'log_type':'quitCampaign',
                  'userid' : user._id,
                  'cid': user.cid,
                  'role' : 'user',
                  'campaignid' :campaign._id
                }
                logController.addLog(logBody);
                  return res.status(200).send(formatCampaign(campaign,req.user));
                }
              });
            }
          })
          .then(null, function (err) {
            res.status(500).send('服务器错误');
          });
        };
      })
      .then(null, function (err) {
        res.status(500).send('服务器错误');
      });
    },
    dealProvoke: function(req, res){
      var campaignId = req.params.campaignId;
      Campaign
      .findById(campaignId)
      .exec()
      .then(function (campaign) {
        if (!campaign||!campaign.active) {
          res.status(404).send('未找到该挑战或该挑战已经被关闭')
        }
        else{
          if (!campaign.isProvoke || campaign.campaign_unit.length<2) {
            return res.status(400).send({msg:'该活动不是挑战'});
          }
          if (campaign.confirm_status) {
            return res.status(400).send({msg:'该挑战已经被应战'});
          }
          //确认状态变更
          var status = req.body.dealType;
          var dealUnitIndex;
          switch(status){
            case 1://接受
              campaign.campaign_unit[1].start_confirm = true;
              campaign.confirm_status = true;
              dealUnitIndex = 1;
              break;
            case 2://拒绝
              campaign.active = false;
              dealUnitIndex = 1;
              break;
            case 3://取消
              campaign.campaign_unit[0].start_confirm = false;
              campaign.active = false;
              dealUnitIndex = 0;
              break;
            default:
              return res.status(400).send({msg:'处理类型错误'});
              break;
          }
          var role = auth.getRole(req.user, {
            companies: [campaign.cid[dealUnitIndex]],
            teams: [campaign.tid[dealUnitIndex]]
          });
          var allow = auth.auth(role, ['sponsorProvoke']);
          if(!allow.sponsorProvoke){
            return res.status(403).send({msg:'您没有权限处理该挑战'});
          }
          campaign.save(function(err){
            if(err){
              res.status(500).send({msg:'保存错误'});
            }
            else{
              //发站内信
              var own_team = status===3? campaign.campaign_unit[0].team:campaign.campaign_unit[1].team;
              var receive_team = status ===3? campaign.campaign_unit[1].team:campaign.campaign_unit[0].team;
              var param = {
                'specific_type':{
                  'value':4,
                  'child_type':status
                },
                'type':'private',
                'caption':campaign.theme,
                'own':{
                  '_id':req.user._id,
                  'nickname':req.user.provider==='company'?req.user.info.official_name: req.user.nickname,
                  'photo':req.user.provider==='company'? req.user.info.logo: req.user.photo,
                  'role':req.user.provider==='company'? 'HR':'LEADER'
                },
                // 'receiver':{
                //   '_id':rst[0].leader[0]._id
                // },
                'content':null,
                'own_team':{
                  '_id':own_team._id,
                  'name':own_team.name,
                  'logo':own_team.logo,
                  'status': status===1 ? 1 :(status===2? 4 :5)
                },
                'receive_team':{
                  '_id':receive_team._id,
                  'name':receive_team.name,
                  'logo':receive_team.logo,
                  'status': status===1 ? 1 :(status===2? 4 :5)
                },
                'campaign_id':campaign._id,
                'auto':true
              };
              CompanyGroup.findOne({'_id':receive_team._id},{leader:1},function(err,opposite_team){
                if(err){
                  log('查询对方小队错误');
                }
                else{
                  param.receiver = {
                    '_id':opposite_team.leader.length? opposite_team.leader[0]._id:''
                  }
                  param.team = [param.own_team,param.receive_team];
                  messageController(app).sendMessage(param);
                }
              });
              //若接受,则发动态、加积分
              if(status ===1){
                pushContoller(app).campaign(campaignId);
                CompanyGroup.update({'_id':{'$in':campaign.tid}},{'$inc':{'score.provoke':15}},function (err,team){
                  if(err){
                    log('RESPONSE_PROVOKE_POINT_FAILED!',err);
                  }
                });
              }
              return res.status(200).send({'msg':'成功'});
            }
          });
        }
      })
      .then(null, function (err) {
        log(err);
        res.status(500).send({msg:'服务器错误'});
      });
    }
  };

};