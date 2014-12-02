'use strict';

var mongoose = require('mongoose');
var Campaign = mongoose.model('Campaign'),
    PhotoAlbum = mongoose.model('PhotoAlbum'),
    CampaignMold = mongoose.model('CampaignMold'),
    User = mongoose.model('User');
var moment = require('moment'),
    async = require('async'),
    xss = require('xss');
var logController = require('../controllers/log');


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
      console.log(req.query)
      var option ={

      }
      Campaign
      .find(option)
      // .populate('photo_album')
      .limit(5)
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
    }
  };

};