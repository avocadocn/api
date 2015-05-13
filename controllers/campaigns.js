'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    CampaignMold = mongoose.model('CampaignMold'),
    User = mongoose.model('User'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    CompetitionMessage = mongoose.model('CompetitionMessage'),
    ScoreBoard = mongoose.model('ScoreBoard');
var moment = require('moment'),
    async = require('async'),
    xss = require('xss');
var logController = require('../controllers/log'),
    updateLatestPhotoService = require('../services/update_latestphotos.js'),
    messageController = require('../controllers/message'),
    auth = require('../services/auth.js'),
    donlerValidator = require('../services/donler_validator.js'),
    log = require('../services/error_log.js'),
    cache = require('../services/cache/Cache'),
    pushService = require('../services/push.js'),
    tools = require('../tools/tools.js'),
    campaignBusiness = require('../business/campaigns');

var perPageNum = 4;
var searchCampaign = function(select_type, option, sort, limit, requestId, teamIds, populate, callback){
  var now = new Date();
  var _option = {}; 
  for (var attr in option){
    _option[attr] = option[attr];
  }
  if (select_type === '5') {
    _option.confirm_status = false;
  } else {
    _option.confirm_status = {
      '$ne': false
    };
  }
  var populate = populate ? populate.split(',').join(' ') :'';
  var outputOption ;
  switch(select_type){
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
      sort ='-end_time';
      _option.end_time = { '$lt':now };
      _option['campaign_unit.member._id'] = requestId;
      limit = 5;
    break;
    //新活动（未参加）
    case '4':
      _option.deadline = { '$gte':now };
      _option['$or'] = [{'tid':{'$in':teamIds}},{'tid':{'$size':0}}];
      _option['$nor'] = [{'campaign_unit.member._id':requestId}];
    break;
    //未确认的挑战
    case '5':
      _option.start_time = { '$gte': now};
      _option.campaign_type = {'$in':[4,5,7,9]};
      _option.tid = {'$in':teamIds};
    break;
    //发同事圈需要的活动
    //暂时定为已参加的所有活动高，按照-start_time排序
    case '6':
      _option['campaign_unit.member._id'] = requestId;
      outputOption = {'theme':1};
      break;
    default:
    break;
  }
  Campaign
  .find(_option,outputOption)
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
 * 格式化活动的小队信息，增加是否为队长属性
 * @param  {[type]} campaign    [description]
 * @param  {[type]} user        [description]
 * @param  {[type]} callbackFun [description]
 * @return {[type]}             [description]
 */
var _formatCampaignUnit = function (campaign,callback) {
  if(campaign.tid) {
    CompanyGroup.find({
      _id: {'$in':campaign.tid}
    })
    .exec()
    .then(function (teams) {
      var campaign_unit = campaign.campaign_unit;
      for (var i = 0; i < campaign_unit.length; i++) {
        var unit = campaign_unit[i];
        for(var j=0; j<unit.member.length; j++) {
          var member = unit.member[j];
          for (var k = 0; k < teams.length; k++) {
            var index = tools.arrayObjectIndexOf(teams[k].leader, member._id, '_id');
            if (index !== -1) {
              member.set('isLeader',true,{strict:false});
              break;
            }
          }
        }
      }
      callback(null,campaign_unit);
    })
    .then(null, function (err) {
      log(err);
      callback(err);
    });
  }
}
var _postCampaign = function (param, callback) {
  var campaign = new Campaign();
  campaign.active = true;
  for (var attr in param) {
    campaign[attr] = param[attr];
  }
  campaign.deadline = param.deadline ? param.deadline : param.end_time;
  var _user = {
    '_id': campaign.poster.uid || campaign.poster.cid,
    'name': campaign.poster.uid ? campaign.poster.nickname : campaign.poster.cname,
    'type': campaign.poster.uid ? 'hr' : 'user'
  };
  var photoInfo = {
    owner: {
      model: {
        // _id: campaign._id,
        type: 'Campaign'
      },
      companies: campaign.cid,
      teams: campaign.tid
    },
    name: moment(campaign.start_time).format("YYYY-MM-DD ") + campaign.theme,
    update_user: _user,
    create_user: _user
  };
  //---Photo
  var photo_album = new PhotoAlbum();
  for (var attr in photoInfo) {
    photo_album[attr] = photoInfo[attr];
  }
  photo_album.owner.model._id = campaign._id;

  // 如果不是公司活动，则将活动的简略信息保存到小队的数据模型中，以便获取最近的活动
  // 这里即使更新失败也只是输出到日志，依然让活动发成功。
  // todo 待测试
  if (campaign.campaign_type !== 1) {
    CompanyGroup.find({
      _id: {'$in':campaign.tid}
    }).exec()
      .then(function (teams) {
        teams.forEach(function (team) {
          team.last_campaign = {
            _id: campaign._id,
            theme: campaign.theme,
            start_time: campaign.start_time
          };
          team.save(function (err) {
            if (err) {
              log(err);
            }
          });
        });

      })
      .then(null, function (err) {
        log(err);
      });

    // // 更新小队的活动数到缓存中，即使失败了，依然让活动发成功
    // // todo 待测试
    // var cacheName = 'teamCampaignCount';
    // cache.createCache(cacheName);

    // campaign.tid.forEach(function (tid) {
    //   Campaign.find({
    //     tid: tid,
    //     active: true
    //   }).count(function (err, count) {
    //     if (err) {
    //       log(err);
    //     } else {
    //       cache.set(cacheName, tid.toString(), count);
    //     }
    //   });
    // });

  }
  //---save
  photo_album.save(function (err) {
    if (err) {
      log(err)
      callback('保存相册失败');
      return;
    }

    campaign.photo_album = photo_album._id;

    campaign.components = [];
    campaign.modularization = true;
    var componentNames = [];
    CampaignMold.findOne({'name': campaign.campaign_mold}, function (err, mold) {
      if (err ||!mold) {
        callback('查找活动类型失败');
        return;
      }
      componentNames = mold.module;
      if (campaign.campaign_unit.length !== 2 || campaign.campaign_type==7) {//单组去除比分板,联谊去除比分扳
        var scoreIndex = componentNames.indexOf('ScoreBoard');
        if (scoreIndex > -1)
          componentNames.splice(scoreIndex, 1);
      }
      async.map(componentNames, function (componentName, asyncCallback) {
        mongoose.model(componentName).establish(campaign, function (err, component) {
          if (err) {
            asyncCallback(err);
          }
          else {
            campaign.components.push({
              name: componentName,
              _id: component._id
            });
            asyncCallback(null, component);
          }
        });
      }, function (err, results) {
        if (err) {
          callback('创建活动组件失败');
          return;
        }
        campaign.save(function (err) {
          if (err) {
            callback('保存活动失败');
            return;
          }
          // todo test push
          var pushData;
          if (campaign.campaign_type === 1) {
            pushData = {
              name: 'companyCampaign',
              target: {
                cid: campaign.cid
              },
              campaignId: campaign._id,
              msg: {
                body: '您有新活动: ' + campaign.theme,
                description: '您有新活动: ' + campaign.theme,
                title: '您的公司有新活动'
              }
            };
          } else {
            // 不是公司活动且不是挑战
            if (campaign.confirm_status === true) {
              pushData = {
                name: 'teamCampaign',
                target: {
                  tid: campaign.tid
                },
                campaignId: campaign._id,
                msg: {
                  title: '您的小队有新活动',
                  body: '您有新活动: ' + campaign.theme,
                  description: '您有新活动: ' + campaign.theme
                }
              }
            }
          }

          if (pushData) {
            pushService.push(pushData, function (err) {
              if (err) {
                log(err);
              }
            });
          }

          callback(null, {'campaign_id': campaign._id, 'photo_album_id': photo_album._id});

        });

      });
    });


  });
};

// 1.0 api 获取活动处理
var getCampaignListHandle = function (req, res) {
  var option,
    requestType = req.query.requestType,
    requestId = req.query.requestId,
    sort = req.query.sortBy || 'start_time',
    limit = parseInt(req.query.limit) || 0,
    populate =req.query.populate || '',
    reqModel,team_ids,CampaignOwner;
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
  if(!mongoose.Types.ObjectId.isValid(requestId)){
    return res.status(400).send({ msg: '参数不正确' });
  }
  mongoose.model(reqModel)
    .findById(requestId)
    .exec()
    .then(function(requestModal){
      if(!requestModal){
        return res.status(404).send({msg:'未找到该活动'});
      }
      var role = auth.getRole(req.user, {
        companies: [requestType=='company' ? requestId : requestModal.cid],
        teams:[requestType=='team' ? requestId : ''],
        users:[requestType=='user' ? requestId : '']
      });
      var allow = auth.auth(role, ['getCampaigns']);
      if(!allow.getCampaigns){
        return res.status(403).send({msg:'您没有权限获取该活动'});
      }
      switch(requestType){
      case 'company':
        option = {
          'active':true,
          'cid' : requestId
        };
        CampaignOwner=req.user;
        break;
      case 'team':
        option = {
          'active':true,
          'cid':requestModal.cid,
          'tid':requestId
        };
        CampaignOwner=req.user;
        break;
      case 'user':
        team_ids = [];
        for( var i = requestModal.team.length-1; i >=0 ; i--) {
          team_ids.push(requestModal.team[i]._id.toString());
        }
        option={
          'active':true,
          'cid': requestModal.cid,
          '$or': [{'tid':{'$in':team_ids}},{'tid':{'$size':0}}]
        };
        if(req.query.join_flag=='1'){
          option['campaign_unit.member._id'] = requestId;
        }
        else if (req.query.join_flag=='0') {
          option['$nor'] = [{'campaign_unit.member._id':requestId}];
        }
        CampaignOwner=requestModal;
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
      if (req.query.nextPageStartId) {
        option._id = { '$lte': req.query.nextPageStartId };
      }
      if(req.query.select_type =='0'){
        async.parallel([
          function(callback){
            searchCampaign('1', option, 'start_time', limit, requestId, team_ids, populate, callback);
          },//即将开始的活动
          function(callback){
            searchCampaign('2', option, 'end_time', limit, requestId, team_ids, populate, callback);
          },//正在进行的活动
          function(callback){
            searchCampaign('4', option, '-create_time', limit, requestId, team_ids, populate, callback);
          },//新活动（未参加）
          function(callback) {
            searchCampaign('3', option, 'end_time', limit, requestId, team_ids, populate, callback);
          }//结束两天内的活动
          // function(callback){
          //   searchCampaign('5', option, '-create_time', limit, requestId, team_ids, populate, callback);
          // }//未确认的挑战
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
                formatCampaigns[index].push(campaignBusiness.formatCampaign(campaign,req.user,CampaignOwner));
              })

            })
            return res.status(200).send(formatCampaigns);
          }
        });
      }
      else {
        searchCampaign(req.query.select_type, option, sort, limit, requestId, team_ids, populate, function (err, campaigns) {
          if (err) {
            log(err);
            res.status(500).send('服务器错误');
          }
          else if (campaigns.length === 0) {
            res.status(200).send([]);
          }
          else {
            if(req.query.select_type === '6') {
              return res.status(200).send(campaigns);
            }
            var formatCampaigns = [];
            campaigns.forEach(function (campaign) {
              formatCampaigns.push(campaignBusiness.formatCampaign(campaign, req.user, CampaignOwner));
            });
            res.status(200).send(formatCampaigns);
          }
        });
      }
    })
    .then(null, function (err) {
      log(err);
      return res.status(500).send({msg: err });
    });
};

module.exports = function (app) {

  return {

    postCampaign: function (req, res) {
      var _campaign_type;
      var messageValidator = function(name, value, callback) {
        CompetitionMessage.findOne({_id: value[0]}, function(err, message) {
          if(err||!message) {
            callback(false, '挑战信id错误');
          }else {
            if(!req.user.isTeamLeader(message.sponsor_team)) {
              callback(false, '非挑战发起队队长不能发起挑战');
            }
            else if(message.status!=='accepted') {
              callback(false, '已生成挑战或您的挑战信未被处理');
            }
            else if(value[1].indexOf(message.sponsor_team.toString())===-1 
              || value[1].indexOf(message.opposite_team.toString())===-1) {
              callback(false, '发挑战小队与站内信小队不符');
            }
            else {
              if(message.competition_type==1) {
                if(message.opposite_cid.toString()===message.sponsor_cid.toString()) {
                  _campaign_type =4;
                }
                else{
                  _campaign_type =5;
                }
                
              }
              else{
                _campaign_type =7;
              }
             
              callback(true);
            }
          }
        });
      };
      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required', donlerValidator.minLength(1)]
        },
        campaign_type: {
          name: '活动类型',
          value: req.body.campaign_type,
          validators: req.body.messageId ? []:['required', 'number']
        },
        tid: {
          name: '小队tid',
          value: req.body.tid,
          validators: req.body.campaign_type ==1 ? []:['required', donlerValidator.minLength(1)]
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
          validators: ['required', donlerValidator.minLength(1)]
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
        },
        deadline: {
          name: '报名截止时间',
          value: req.body.deadline,
          validators: [donlerValidator.after(new Date()),donlerValidator.before(req.body.end_time)]
        },
        member_max: {
          name: '人数上限',
          value: req.body.member_max,
          validators: ['number']
        },
        member_min: {
          name: '人数下限',
          value: req.body.member_min,
          validators: ['number']
        },
        messageId: {
          name: '挑战信id',
          value: [req.body.messageId, req.body.tid],
          validators: req.body.messageId ? [messageValidator]: []
        }
      }, 'complete', function (pass, msg) {
        if (!pass) {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
          return;
        }
        var role = auth.getRole(req.user, {
          companies: [req.body.cid[0]],
          teams: req.body.tid ? req.body.tid:[]
        });
        var taskName = req.body.campaign_type == 1 ? 'sponsorCompanyCampaign': 'sponsorTeamCampaign';
        var allow = auth.auth(role, [taskName]);
        if(!allow[taskName]){
          return res.status(403).send({msg:'您没有权限发布该活动'});
        }
        var param = {
          cid: req.body.cid,
          campaign_type: _campaign_type || req.body.campaign_type,
          theme: req.body.theme,
          location: req.body.location,
          campaign_mold: req.body.campaign_mold,
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          content: req.body.content
        };
        if(req.body.tid){ 
          param.tid = req.body.tid;
        }
        if(req.body.deadline){ 
          param.deadline = req.body.deadline;
        }
        if(req.body.member_max){ 
          param.member_max = req.body.member_max;
        }
        if(req.body.member_min){ 
          param.member_min = req.body.member_min;
        }
        //由挑战信来的
        if(req.body.messageId) {          
          param.competition_message = req.body.messageId;
        }
        async.parallel([
          function(callback){
            Company
              .find({_id:{'$in':param.cid}})
              .exec()
              .then(function (companies) {
                callback(null,companies);
              })
              .then(null,function(err){
                callback(err)
              });

          },
          function(callback){
            if(param.tid){
              CompanyGroup
                .find({_id:{'$in':param.tid}})
                .exec()
                .then(function (companyGroups) {
                  callback(null,companyGroups)
                })
                .then(null,function(err){
                  callback(err)
                });
            }
            else{
              callback(null)
            }
          }
        ],function(err, values){
          //values:[[companies], [teams]]
          if(err){
            log(err);
            return res.status(500).send({ msg: '服务器错误'});
          }
          else{
            //活动的发起者
            param.poster = {
              cid: req.user.cid || req.user._id,                       //活动发起者所属的公司
              cname: req.user.cname || req.user.info.official_name,
              role: req.user.provider=="user" ?'LEADER' : 'HR'
            }
            if(req.user.provider=="user"){
              param.poster.uid = req.user._id;
              param.poster.nickname = req.user.nickname;
            }
            //unit
            param.campaign_unit = [];

            //如果是递归活动
            if(param.campaign_type === 2 && param.tid.length>1) {
              var length = req.body.tid.length;
              var i = 0;
              var results = [];
              async.whilst(
                function() {return i< length},
                function(cb) {
                  var newParam = param;
                  newParam.tid = [req.body.tid[i]];
                  var unit = {};
                  unit.company = {
                    _id: param.cid[0],
                    name: values[0][0].info.official_name,
                    logo: values[0][0].info.logo
                  };
                  for(var j = 0; j<values[1].length; j++) {
                    if(newParam.tid.toString() === values[1][j]._id.toString()) {
                      unit.team = {
                        _id: values[1][j]._id,
                        name: values[1][j].name,
                        logo: values[1][j].logo
                      };
                    }
                  }
                  newParam.campaign_unit=[unit];
                  i++;
                  _postCampaign(newParam, function(err, result){
                    if(err){
                      cb(err);
                    }
                    else{
                      results.push(result);
                      cb(null);
                    }
                  });
                },
                function(err) {
                  if(err) {
                    console.log(err);
                    res.status(500).send({msg:err});
                  }else {
                    res.send(results);
                  }
                }
              );
            }
            else {//非递归活动
              param.cid.forEach(function(cid,index){
                var unit ={};
                for (var i = values[0].length - 1; i >= 0; i--) {
                  if(values[0][i]._id.toString()===cid){
                    unit.company = {
                      _id: cid,
                      name: values[0][i].info.official_name,
                      logo: values[0][i].info.logo
                    }
                    break;
                  }
                };
                if(param.tid){
                  for (var j = values[1].length - 1; j >= 0; j--) {
                    if(values[1][j]._id.toString()===param.tid[index]){
                      unit.team = {
                        _id: values[1][j]._id,
                        name: values[1][j].name,
                        logo: values[1][j].logo
                      }
                      if(req.body.messageId) {
                        unit.start_confirm = true;
                      }
                      else if(index===0) {
                        unit.start_confirm = true;
                      }
                      break;
                    }
                  }
                }
                param.campaign_unit.push(unit);
              });
              _postCampaign(param, function(err,result){
                if(err){
                  res.status(500).send({msg:err});
                }
                else{
                  res.send(result);
                  //更新competitionMessage
                  if(req.body.messageId) {
                    CompetitionMessage.findByIdAndUpdate(req.body.messageId, 
                      {'$set':{'status':'competing', 'campaign':result.campaign_id}}, 
                      function(err, message) {
                      if(err) {
                        log(err);
                      }
                    });
                  }
                }
              });
            }
          }
        });
      });
    },
    getCampaign: function (req, res) {
      var campaign = req.campaign;
      async.series([
        function(callback){
          //var _formatCampaign = formatCampaign(campaign,req.user);
          //callback(null,_formatCampaign);
          campaignBusiness.formatCampaign(campaign, req.user, req.user, function (err, resCampaign) {
            callback(null, resCampaign);
          });
        },//格式化活动
        function(callback){
          _formatCampaignUnit(campaign,callback);
        }
      ],function(err, values){
        if(err){
          log(err);
          return res.status(500).send({ msg: '服务器错误'});
        }
        else{
          var formatCampaign = values[0];
          formatCampaign.campaign_unit = values[1];
          return res.status(200).send(formatCampaign);
        }
      });
    },
    updateCampaign: function (req, res) {
      var campaign = req.campaign;
      if (!campaign) {
        res.status(404).send({msg:'未找到活动'})
      }
      else{
        var role = auth.getRole(req.user, {
          companies: campaign.cid,
          teams: campaign.tid
        });
        var taskName = campaign.campaign_type==1?'editCompanyCampaign':'editTeamCampaign';
        var allow = auth.auth(role, [taskName]);
        if(!allow[taskName]){
          return res.status(403).send({msg:'您没有权限获取该活动'});
        }
        if(campaign.start_time<new Date()){
          return res.status(400).send({msg:'活动已经开始，无法进行编辑'});
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
        if(campaign.member_min>campaign.member_max) {
          return res.status(400).send({msg:'人数上限不能小于下限'});
        }
        if(req.body.tags) {
          campaign.tags = req.body.tags;
        }
        if(req.body.deadline) {
          campaign.deadline = req.body.deadline;
        }
        campaign.save(function (err) {
          if (err) {
            return res.status(500).send({msg:'数据保存错误'});
          } else {
            return res.status(200).send(campaign);
          }
        });
      }
    },
    closeCampaign: function (req, res) {
      var campaign = req.campaign;
      if (!campaign.active) {
        res.status(404).send({msg:'未找到可以关闭的活动'});
      }
      else{
        var role = auth.getRole(req.user, {
          companies: campaign.cid,
          teams: campaign.tid
        });
        var taskName = campaign.campaign_type==1?'editCompanyCampaign':'editTeamCampaign';
        var allow = auth.auth(role, [taskName]);
        if(!allow[taskName]){
          return res.status(403).send({msg:'您没有权限获取该活动'});
        }
        campaign.active = false;
        campaign.save(function (err) {
          if (err) {
            return res.status(500).send({msg:'关闭活动失败'});
          } else {
            return res.send({ result: 1, msg: '关闭活动成功' });
          }
        });
      }
    },
    joinCampaign: function(req, res){
      
      if(!mongoose.Types.ObjectId.isValid(req.params.userId)){
        return res.status(400).send({ msg: '用户信息有误' });
      }
      var campaign = req.campaign;
      if (!campaign.active) {
        return res.status(400).send({msg:'该活动已经关闭'});
      }
      else if (!campaign.confirm_status) {
        return res.status(400).send({msg:'该活动还未应战，无法参加'});
      }
      else if (campaign.deadline < Date.now()) {
        return res.status(400).send({
          msg: '活动报名已经截止'
        });
      }
      else if (campaign.member_max > 0) {
        if (campaign.members.length >= campaign.member_max) {
          return res.status(400).send({
            msg: '报名人数已达上限'
          });
        }
      }
      var role = auth.getRole(req.user, {
        companies: campaign.cid,
        teams: campaign.tid,
        users:campaign.member
      });
      var taskName = campaign.campaign_type==1?'joinCompanyCampaign':'joinTeamCampaign';
      var allow = auth.auth(role, [taskName]);
      if(!allow[taskName]){
        return res.status(403).send({msg:'您没有权限参加该活动'});
      }
      User.findById(req.params.userId)
      .exec()
      .then(function(user){
        var _join = function (unit) {
          // 更新user的讨论列表
          // var campaignIndex = tools.arrayObjectIndexOf(user.unjoinedCommentCampaigns,campaign._id,'_id');
          // if(campaignIndex>-1){
          //   var campaignNeedUpdate = user.unjoinedCommentCampaigns.splice(campaignIndex,1);
          //   user.commentCampaigns.push(campaignNeedUpdate[0]);
          //   user.save(function (err) {
          //     if (err)
          //       console.log(err);
          //   });
          // }
          for (var i = 0; i < unit.member.length; i++) {
            if (user._id.toString() === unit.member[i]._id.toString()) {
              // 用户已经参加该活动
              return {
                success: false,
                msg: '您已经参加该活动'
              };
            }
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
          // 加入活动，活动参加人数加1
          campaign.number_of_members = campaign.number_of_members + 1;
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
              async.series([
                function(callback){
                  var _formatCampaign = campaignBusiness.formatCampaign(campaign,req.user,req.user);
                  callback(null,_formatCampaign);
                },//格式化活动
                function(callback){
                  _formatCampaignUnit(campaign,callback);
                }
              ],function(err, values){
                if(err){
                  log(err);
                  return res.status(500).send({ msg: '服务器错误'});
                }
                else{
                  var formatCampaign = values[0];
                  formatCampaign.campaign_unit = values[1];
                  return res.status(200).send(formatCampaign);
                }
              });
            }
          });
        }
      })
      .then(null, function (err) {
        log(err)
        res.status(500).send({msg:'服务器错误'});
      });
    },
    quitCampaign: function(req,res){
      if(!mongoose.Types.ObjectId.isValid(req.params.userId)){
        return res.status(400).send({ msg: '用户信息有误' });
      }
      var campaign = req.campaign;
      if (!campaign.active) {
        return res.status(400).send({msg:'该活动已经关闭'});
      }
      else if (!campaign.confirm_status) {
        return res.status(400).send({msg:'该活动还未应战，无法参加'});
      }
      else if (campaign.deadline < Date.now()) {
        return res.status(400).send({
          msg: '活动报名已经截止'
        });
      }
      var role = auth.getRole(req.user, {
        users: [req.params.userId]
      });
      var allow = auth.auth(role, ['quitCampaign']);
      if(!allow.quitCampaign){
        return res.status(403).send({msg:'您没有权限退出该活动'});
      }
      User.findById(req.params.userId)
      .exec()
      .then(function(user){
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
              // var campaignIndex = tools.arrayObjectIndexOf(user.commentCampaigns,campaign._id,'_id');
              // if(campaignIndex > -1){
              //   var campaignNeedUpdate = user.commentCampaigns.splice(campaignIndex,1);
              //   user.unjoinedCommentCampaigns.push(campaignNeedUpdate[0]);
              //   user.save(function (err) {
              //     if (err)
              //       console.log(err);
              //   });
              // }
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
          // 退出活动，活动参加人数减1
          if(campaign.number_of_members > 0) {
            campaign.number_of_members = campaign.number_of_members - 1;
          }
          campaign.save(function (err) {
            if (err) {
              log(err);
              return req.status(500).send({
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
              async.series([
                function(callback){
                  var _formatCampaign = campaignBusiness.formatCampaign(campaign,req.user,req.user);
                  callback(null,_formatCampaign);
                },//格式化活动
                function(callback){
                  _formatCampaignUnit(campaign,callback);
                }
              ],function(err, values){
                if(err){
                  log(err);
                  return res.status(500).send({ msg: '服务器错误'});
                }
                else{
                  var formatCampaign = values[0];
                  formatCampaign.campaign_unit = values[1];
                  return res.status(200).send(formatCampaign);
                }
              });
            }
          });
        }
      })
      .then(null, function (err) {
        res.status(500).send({msg:'服务器错误'});
      });
    },
    dealProvoke: function(req, res){
      var campaign = req.campaign;
      if (!campaign.active) {
        return res.status(400).send({msg:'该活动已经被关闭'})
      }
      else if (!campaign.isProvoke || campaign.campaign_unit.length<2) {
        return res.status(400).send({msg:'该活动不是挑战'});
      }
      else if (campaign.confirm_status) {
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
            // 'own':{
            //   '_id':req.user._id,
            //   'nickname':req.user.provider==='company'?req.user.info.official_name: req.user.nickname,
            //   'photo':req.user.provider==='company'? req.user.info.logo: req.user.photo,
            //   'role':req.user.provider==='company'? 'HR':'LEADER'
            // },
            // 'receiver':{
            //   '_id':rst[0].leader[0]._id
            // },
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
              messageController(app)._sendMessage(param);
            }
          });
          //若接受,则发动态、加积分
          if(status ===1){
            // todo test push
            pushService.push({
              name: 'teamCampaign',
              target: {
                tid: campaign.tid
              },
              campaignId: campaign._id,
              msg: {
                title: '您的小队有新活动',
                body: '您有新活动: ' + campaign.theme,
                description: '您有新活动: ' + campaign.theme
              }
            }, function (err) {
              if (err) {
                log(err);
              }
            });
            CompanyGroup.update({'_id':{'$in':campaign.tid}},{'$inc':{'score.provoke':15}},function (err,team){
              if(err){
                log('RESPONSE_PROVOKE_POINT_FAILED!',err);
              }
            });
          }
          return res.status(200).send({'msg':'成功'});
        }
      });
    },
    getCampaignMolds: function(req, res) {
      CampaignMold.find(null,{name:1},function(err,molds){
        if(err){
          return res.status(500).send({'msg':'获取活动类型失败!'});
        }
        else{
          if(req.params.requestType==='team'){
            CompanyGroup.findOne({'_id':req.params.requestId},{'group_type':1},function(err,team){
              if(err){
                log(err);
              }
              else if(team){
                //把跟自己小组类型相同的mold换到第0个
                for(var i=0;i<molds.length;i++){
                  if(molds[i].name===team.group_type){
                    if(i===0)
                      break;
                    else{
                      var temp = molds[0];
                      molds[0]=molds[i];
                      molds[i]=temp;
                      break;
                    }
                  }
                }
              }
              return res.send(molds);
            });
          }
          else{
            return res.send(molds);
          }
        }
      });
    },
    getCompetitionOfTeams: function  (req, res) {
      var fromTeamId = req.params.fromTeamId;
      var targetTeamId = req.params.targetTeamId;
      var page = req.query.page > 0? req.query.page:1;
      if(req.user.isTeamMember(fromTeamId) || req.user.isTeamMember(targetTeamId)) {
        var options = {
          'tid':  { $all:[ fromTeamId, targetTeamId ]},
          'end_time': {$lt: Date.now()}
        };
        Campaign.paginate(options, page, perPageNum, function(err, pageCount, results, itemCount) {
          if(err){
            log(err);
            res.status(500).send({msg:err});
          }
          else{
            var competitions = [];
            for (var i = results.length - 1; i >= 0; i--) {
              var competition = {
                '_id' : results[i]._id,
                'theme' : results[i].theme,
                'members_count' : results[i].members.length,
                'location' : {name : results[i].location.name},
                'start_time' : results[i].start_time,
                'campaign_unit' : results[i].campaign_unit,
                'campaign_type' : results[i].campaign_type
              };
              competitions.push(competition);
            };
            return res.send({'competitions':competitions,'maxPage':pageCount});
          }
        },{columns:{'campaign_unit':1,'theme':1,'start_time':1, 'location':1, 'campaign_type':1}, sortBy:{'start_time':-1}});
      }
      else{
        res.status(403).send({msg:'您没有权限获取该信息！'});
      }
    },
    getCompetitionOfCompanyWithTeam: function  (req, res) {
      var targetTeam = req.companyGroup;
      var cid = req.user.cid || req.user._id;
      if(targetTeam.cid.toString() ===cid.toString())
        return res.status(400).send({msg:'不能获取本公司的小队与公司间的比赛'});
      var page = req.query.page > 0? req.query.page:1;
      var options = {
        'cid': { $all:[ cid, targetTeam.cid ]},
        'tid': targetTeam._id,
        'end_time': {$lt: Date.now()}
      };
      Campaign.paginate(options, page, perPageNum, function(err, pageCount, results, itemCount) {
        if(err){
          log(err);
          res.status(500).send({msg:err});
        }
        else{
          var competitions = [];
          for (var i = results.length - 1; i >= 0; i--) {
            var competition = {
              '_id' : results[i]._id,
              'theme' : results[i].theme,
              'members_count' : results[i].members.length,
              'location' : {name : results[i].location.name},
              'start_time' : results[i].start_time,
              'campaign_unit' : results[i].campaign_unit,
              'campaign_type' : results[i].campaign_type
            };
            competitions.push(competition);
          }
          return res.send({'competitions':competitions,'maxPage':pageCount});
        }
      },{columns:{'campaign_unit':1,'theme':1,'start_time':1, 'location':1, 'campaign_type':1}, sortBy:{'start_time':-1}});
    },
    // todo
    getCampaigns: {
      // 兼容旧版本api，如果请求的url query中没有result，则按1.0的api处理，否则使用1.2的api
      // 这里不使用版本号区分是出于如下考虑：
      // api服务器和app及网页客户端不可能完全同时更新，app查询活动部分也没有更新，使用1.2的api必须保证以前的功能可用，可以逐步修改
      // 使用版本号区分，旧的查询活动请求也可能会附带新的版本号，这样将导致错误；或是在同一app版本中要使用不同版本的api
      switcher: function (req, res, next) {
        if (!req.query.result) {
          donlerValidator({
            requestType: {
              name: 'requestType',
              value: req.query.requestType,
              validators: [donlerValidator.enum(['user', 'team', 'company']), 'required']
            },
            requestId: {
              name: 'requestId',
              value: req.query.requestId,
              validators: ['required', 'objectId']
            },
            select_type: {
              name: 'select_type',
              value: req.query.select_type,
              validators: [donlerValidator.enum(['0', '1', '2', '3', '4', '5', '6'])]
            },
            join_flag: {
              name: 'join_flag',
              value: req.query.join_flag,
              validators: [donlerValidator.enum(['0', '1'])]
            },
            limit: {
              name: 'limit',
              value: req.query.limit,
              validators: ['number']
            },
            populate: {
              name: 'populate',
              value: req.query.populate,
              validators: [donlerValidator.enum(['photo_album'])]
            },
            // 分页时下一页开始的活动id
            nextPageStartId: {
              name: 'nextPageStartId',
              value: req.query.nextPageStartId,
              validators: ['objectId']
            }
          }, 'fast', function (pass, msg) {
            if (pass) {
              // 使用1.0 api的处理逻辑
              getCampaignListHandle(req, res);
            } else {
              return res.status(400).send({ msg: donlerValidator.combineMsg(msg) });
            }
          });
        } else {
          return next();
        }
      },

      // 过滤请求数据
      filter: function (req, res, next) {
        // todo 调整需要的请求查询参数后，donlerValidators暂时不适用于现在的验证，先跳过，完成api后再补充请求数据的过滤
        /**
         * 查询参数:
         *  cid: 查询公司活动时需要的公司id
         *  tids: 查询小队活动时需要的小队id, 是一个数组
         *  uid: 查询用户的活动时所需要的用户id
         *  result: 返回结果类型
         *  attrs: 附加属性, 如'join','playing'等, 是一个数组
         *  limit: 返回的活动数
         *  sort: 排序依据
         *  from: 时间区间的开始
         *  to: 时间区间的结束
         *  page_id: 分页用的id
         */
        next();
      },

      // 获取活动所有者的数据，例如获取公司活动，则获取公司数据；如果获取小队活动，则获取小队数据
      getHolder: function (req, res, next) {
        // uid 存在时，忽略cid和tids，只考虑个人的活动；如果uid不存在，则cid或tids至少存在一个
        req.campaignOwner = {};
        if (req.query.uid) {
          User.findById(req.query.uid, {
            _id: 1,
            cid: 1
          }).exec()
            .then(function (user) {
              if (!user) {
                res.status(404).send({ msg: '找不到活动' });
              } else {
                req.campaignOwner.user = user.toObject();
                next();
              }
            })
            .then(null, function (err) {
              next(err);
            });
        } else if (req.query.cid || req.query.tids) {
          async.parallel({
            company: function (parallelCallback) {
              if (!req.query.cid) {
                return parallelCallback();
              }
              Company.findById(req.query.cid, {
                _id: 1
              }).exec()
                .then(function (company) {
                  if (!company) {
                    res.status(404).send({ msg: '找不到活动' });
                  } else {
                    req.campaignOwner.company = company.toObject();
                    parallelCallback();
                  }
                })
                .then(null, function (err) {
                  parallelCallback(err);
                });
            },
            teams: function (parallelCallback) {
              if (!req.query.tids) {
                return parallelCallback();
              }
              CompanyGroup.find({
                _id: req.query.tids
              }, {
                _id: 1,
                cid: 1
              }).exec()
                .then(function (teams) {
                  var length = 1;
                  if (req.query.tids instanceof Array) {
                    length = req.query.tids.length;
                  }
                  if (teams.length !== length) {
                    res.status(404).send({ msg: '找不到活动' });
                  } else {
                    req.campaignOwner.teams = teams.map(function (team) { return team.toObject(); });
                    parallelCallback();
                  }
                })
                .then(null, function (err) {
                  parallelCallback(err);
                });
            }
          }, function (err, result) {
            if (err) {
              next(err);
            } else {
              next();
            }
          });
        } else {
          res.status(400).send({ msg: '请求参数错误' });
        }

      },

      // 权限判断
      auth: function (req, res, next) {
        var tasks = campaignBusiness.getAuthTasks(req.campaignOwner, req.query.attrs, req.query.result);

        var owner = {
          companies: req.campaignOwner.company ? [req.campaignOwner.company._id] : [],
          teams: req.campaignOwner.teams ? req.campaignOwner.teams.map(function (team) { return team._id; }) : [],
          users: req.campaignOwner.user ? [req.campaignOwner.user._id] : []
        };

        var role = auth.getRole(req.user, owner);
        var allow = auth.auth(role, tasks);
        for (var task in allow) {
          if (!allow[task]) {
            return res.status(403).send({ msg: '权限不足' });
          }
        }
        return next();
      },

      // 查询数据，使用相应的formatter去转换成合适的数据结构，并写入响应
      queryAndFormat: function (req, res, next) {

        campaignBusiness.queryAndFormat({
          reqQuery: req.query,
          campaignOwner: req.campaignOwner,
          user: req.user
        }, function (err, data) {
          if (err) {
            return next(err);
          } else {
            return res.send(data);
          }
        });
      }
    }

  };

};
