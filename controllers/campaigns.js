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
    messageController = require('../controllers/message');


module.exports = function (app) {

  return {

    postCampaign: function (req, res) {
      var campaign = new Campaign();
      // campaign.theme = basicInfo.theme;//主题
      // campaign.content = basicInfo.content ? basicInfo.content : ''; //活动内容
      // campaign.location = basicInfo.location; //活动地点
      // campaign.start_time = basicInfo.start_time;
      // campaign.end_time = basicInfo.end_time;
      // campaign.member_min = basicInfo.member_min ? basicInfo.member_min : 0;
      // campaign.member_max = basicInfo.member_max ? basicInfo.member_max : 0;
      // campaign.deadline = basicInfo.deadline ? basicInfo.deadline : basicInfo.end_time;
      campaign.active = true;
      // campaign.campaign_mold = basicInfo.campaign_mold?basicInfo.campaign_mold:'其它';//以防万一
      // if(basicInfo.tags&&basicInfo.tags.length>0)
      //   campaign.tags = basicInfo.tags;
      var _now = new Date();
      if (req.body.start_time < _now || req.body.end_time < _now || req.body.deadline < _now) {
        return res.status(400).send('活动的时间比现在更早');
      }
      else{
        //---providerInfo
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
      }
    },
    getCampaign: function (req, res) {
      var option,
          requestType = req.query.requestType,
          requestId = req.query.requestId,
          sort = req.query.sortBy || 'start_time',
          limit = parseInt(req.query.limit) || 0,
          now = new Date();
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
            'tid':requestId
          }
        break;
        case 'user':
          var team_ids = [];
          for( var i = req.user.team.length-1; i >=0 ; i--) {
            team_ids.push(req.user.team[i]._id.toString());
          }
          option={
            'active':true,
            'cid': req.user.cid
          }
          if(req.query.join_flag=='1'){
            option['campaign_unit.member._id'] = requestId;
          }
          else{
            option['$or'] = [{'tid':{'$in':team_ids}},{'tid':{'$size':0}}];
          }
        break;
        default:
        break;
      }
      switch(req.query.select_type){
        //即将开始的活动
        case '1':
          option.start_time = { '$gte':now };
        break;
        //正在进行的活动
        case '2':
          option.start_time = { '$lt':now };
          option.end_time = { '$gte':now };
        break;
        //已经结束的活动
        case '3':
          option.end_time = { '$lte':now };
        break;
        default:
        break;
      }
      //未确认的挑战
      if(req.query.provoke_flag){
        option.confirm_status = false;
        option.start_time = { '$gte': now};
        option.campaign_type = {'$in':[4,5,7,9]};
      }
      Campaign
      .find(option)
      .sort(sort)
      .limit(limit)
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动');
        }
        else{
          res.status(200).send(campaign);
        }
      })
      .then(null, function (err) {
        res.status(500).send('服务器错误');
      });
    },
    getCampaignById: function (req, res) {
      Campaign
      .findById(req.params.campaignId)
      //.populate('photo_album')
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动')
        }
        else{
          res.status(200).send(campaign);
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
                  console.log(err);
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
                  return res.status(200).send(campaign);
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
    quitCampaign: function(req,res){
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
                  console.log(err);
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
                  return res.status(200).send(campaign);
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
      //.populate('photo_album')
      .exec()
      .then(function (campaign) {
        if (!campaign) {
          res.status(404).send('未找到活动')
        }
        else{
          if (!campaign.isProvoke || campaign.campaign_unit.length<2) {
            return res.status(400).send('该活动不是挑战');
          }
          //确认状态变更
          var status = req.body.dealType;
          switch(status){
            case 1://接受
              campaign.campaign_unit[1].start_confirm = true;
              campaign.confirm_status = true;
              break;
            case 2://拒绝
              campaign.active = false;
              break;
            case 3://取消
              campaign.campaign_unit[0].start_confirm = false;
              campaign.active = false;
              break;
          }

          campaign.save(function(err){
            if(err){
              res.status(500).send('保存错误');
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
                  res.status(500);
                  next('查询对方小队错误');
                }
                else{
                  param.receiver = {
                    '_id':opposite_team.leader.length? opposite_team.leader[0]._id:''//要是没有队长呢......
                  }
                  messageController.sendToOne(req,res,param);
                }
              });
              //若接受,则发动态、加积分
              if(status ===1){
                push.campaign(campaignId);
                GroupMessage.findOne({campaign:campaign._id}).exec(function(err,groupMessage){
                  groupMessage.message_type = 5;
                  groupMessage.create_time = new Date();
                  groupMessage.save(function (err) {
                    if (err) {
                      console.log('保存约战动态时出错' + err);
                    }
                  });
                });
                CompanyGroup.update({'_id':{'$in':campaign.tid}},{'$inc':{'score.provoke':15}},function (err,team){
                  if(err){
                    console.log('RESPONSE_PROVOKE_POINT_FAILED!',err);
                  }
                });
              }
              return res.send({'result':1,'msg':'SUCCESS'});
            }
          });
        }
      })
      .then(null, function (err) {
        console.log(err)
        res.status(500).send('服务器错误');
      });
    }
  };

};