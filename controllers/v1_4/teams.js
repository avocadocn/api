'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Company = mongoose.model('Company'),
  CompanyGroup = mongoose.model('CompanyGroup'),
  Campaign = mongoose.model('Campaign'),
  Group = mongoose.model('Group');

var log = require('../../services/error_log.js'),
  groups = require('../../business/groups.js'),
  cache = require('../../services/cache/Cache'),
  auth = require('../../services/auth.js'),
  uploader = require('../../services/uploader.js'),
  syncData = require('../../services/sync_data.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  userScore = require('../../services/user_score.js'),
  tools = require('../../tools/tools.js'),
  async = require('async');
var personalTeamScoreLimit = 100;
var perPageNum = 4;
module.exports = function (app) {

  return {

    getTeamsValidate: function (req, res, next) {
      donlerValidator({
        hostType: {
          name: 'hostType',
          value: req.query.hostType,
          validators: ['required', donlerValidator.enum(['company', 'user'])]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    getTeamsSetQueryOptions: function(req, res, next) {
      var options = {
        gid: {
          '$ne': '0'
        },
        company_active: {$in: [true, null]}
      };

      if (req.query.personalFlag == 'true') {
        options['poster.role'] = 'Personal';
      } else if (req.query.personalFlag != undefined) {
        options['poster.role'] = 'HR';
      }

      req.options = options;

      switch (req.query.hostType) {
        case 'company':
          options.cid = req.query.hostId || req.user.cid || req.user._id;
          if (req.user.provider === 'user') {
            if(req.query.timehash) {
              options.timeHash = {'$gt': new Date(parseInt(req.query.timehash))};
            } else {
              options.active = true;
            }
          }
          next();
          break;
        case 'user':
          if (req.query.timehash) {
            options.timeHash = {'$gt': new Date(parseInt(req.query.timehash))};
          } else {
            options.active = true;
          }
          // TODO use $elemMatch
          var addIdsToOptions = function(userTeams) {
            var teams = userTeams.filter(function(team) {
              if (team.group_type === 'virtual' || req.query.gid && req.query.gid != team.gid || req.query.leadFlag && !team.leader) {
                return false;
              } else {
                return true;
              }
            });
            var tids = tools.flatCollect(teams, '_id');
            options._id = {
              $in: tids
            };
          };

          /**
           * Maybe, this outputOptions setting(brief) is outdated.
           */
          //如果只要取用户的小队简单信息
          if (req.query.brief === 'true') {
            req.outputOptions = {
              'name': 1,
              'logo': 1
            }
          }
          // 
          if (!req.query.hostId || req.query.hostId === req.user._id.toString()) {
            options.cid = req.user.cid || req.user._id;
            addIdsToOptions(req.user.team);
            next();
          } else {
            User.findById(req.query.hostId).exec()
              .then(function(user) {
                if (!user) {
                  res.status(404).send({
                    msg: '用户查找失败'
                  });
                  return;
                }
                options.cid = user.cid;
                addIdsToOptions(user.team);
                next();
              })
              .then(null, function(err) {
                log(err);
                res.status(500).send({
                  msg: '用户查找错误'
                });
              });
          }
          break;
      }
    },

    getTeams: function(req, res) {
      var role = auth.getRole(req.user, {
        companies:[req.options.cid]
      });
      var allow = auth.auth(role,['getTeams']);
      if(!allow.getTeams) {
        return res.status(403).send({msg: '权限错误'});
      }
      CompanyGroup
        .find(req.options, req.outputOptions)
        .populate('poster._id')
        .sort('-score_rank.score -score.total')
        .exec()
        .then(function (companyGroups) {
          var formatCompanyGroups = [];
          //若是在发评论时取小队,只取部分数据 todo
          if(req.query.brief==='true') {
            return res.status(200).send(companyGroups);
          }
          for (var i = 0; i < companyGroups.length; i++) {
            var membersWithoutLeader = [];
            companyGroups[i].member.forEach(function (member) {
              var isLeader = false;
              for (var j = 0; j < companyGroups[i].leader.length; j++) {
                var leader = companyGroups[i].leader[j];
                if (leader._id.toString() === member._id.toString()) {
                  isLeader = true;
                  break;
                }
              }
              if (!isLeader) {
                membersWithoutLeader.push(member);
              }
            });
            //过滤隐藏
            var originFamilyPhotos = companyGroups[i].family.filter(function (photo) {
              return !photo.hidden && photo.select;
            });
            //只需传uri
            var familyPhotos = [];
            for (var j = 0; j < originFamilyPhotos.length; j++) {
              familyPhotos.push({
                uri: originFamilyPhotos[j].uri
              });
            }
            var briefTeam = {
              _id: companyGroups[i]._id,
              active: companyGroups[i].active,
              name: companyGroups[i].name,
              cname: companyGroups[i].cname,
              logo: companyGroups[i].logo,
              groupType: companyGroups[i].group_type,
              createTime: companyGroups[i].create_time,
              brief: companyGroups[i].brief,
              leaders: companyGroups[i].leader,
              members: membersWithoutLeader.slice(0, 6 - companyGroups[i].leader.length),
              campaignCount: companyGroups[i].count.total_campaign,
              memberCount: companyGroups[i].member.length,
              homeCourts: companyGroups[i].home_court,
              cid: companyGroups[i].cid,
              familyPhotos: familyPhotos,
              lastCampaign: companyGroups[i].last_campaign,
              score: companyGroups[i].score,
              officialTeam: companyGroups[i].poster.role=='Personal' ? false : true,
              score_rank: companyGroups[i].score_rank,
              gid:companyGroups[i].gid,

              totalScore: companyGroups[i].score.total, // use temporally
              campaignScore: companyGroups[i].score.campaign, // use temporally
              leader: companyGroups[i].leader.length ? companyGroups[i].leader[0].nickname : '暂无', // use temporally

              timeHash: companyGroups[i].timeHash
            };
            if(role.company=='hr'){
              briefTeam.count = companyGroups[i].count;
              // briefTeam.members = membersWithoutLeader;
            }
            if(companyGroups[i].poster.role=='Personal') {
              briefTeam.poster = {
                _id:companyGroups[i].poster._id._id,
                nickname: companyGroups[i].poster._id.nickname,
                photo: companyGroups[i].poster._id.photo
              }
              briefTeam.level = companyGroups[i].level;
            }
            // 判断用户是否加入了该小队
            if (role.company=== 'member') {
              briefTeam.hasJoined = companyGroups[i].hasMember(req.query.hostId || req.user._id);
              briefTeam.isLeader = companyGroups[i].isLeader(req.query.hostId || req.user._id);
            }
            formatCompanyGroups.push(briefTeam);
          }
          console.log(formatCompanyGroups.slice(0, 1));
          return res.status(200).send(formatCompanyGroups);
        })
        .then(null, function (err) {
          log(err);
          console.log(err);
          res.status(500).send({msg: '小队信息获取错误'});
        });
    },
    deleteTeam : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['closeTeam']);
      if(!allow.closeTeam){
        return res.status(403).send({msg: '权限错误'});
      }else{
        if(!team.active){
          return res.status(400).send({msg: '该小队已经被关闭'});
        }
        team.active = false;
        team.timeHash = new Date();
        team.save(function(err){
          if(err){
            log(err);
            res.status(500).send({msg:'保存错误'});
          }
          else{
            res.status(200).send({msg:'成功'});
            var LeaderFilter = function(userTeam) {
              if(userTeam.leader===true) {
                return true;
              }
              return false;
            };
            if(team.leader.length>0) {
              User.findById(team.leader[0]._id, function(err, user) {
                if(err) {
                  console.log(err);
                }
                else if(user) {
                  var leaderTeams = user.team.filter(LeaderFilter);
                  if(leaderTeams.length===1) {
                    user.role = 'EMPLOYEE';
                  }
                  user.save(function(err) {
                    if(err) {
                      console.log(err);
                    }
                  })
                }
              });
            }
          }
        });
      }
    },
    openTeam : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['closeTeam']);
      if(!allow.closeTeam){
        return res.status(403).send({msg: '权限错误'});
      }else{
        if(team.active){
          return res.status(400).send({msg: '该小队处于已处于打开状态'});
        }
        team.active = true;
        team.timeHash = new Date();
        team.save(function(err){
          if(err){
            log(err);
            return res.status(500).send({msg:'保存错误'});
          }
          else{
            res.status(200).send({msg:'成功'});
            if(team.leader.length>0) {
              User.findByIdAndUpdate(team.leader[0]._id,{'$set': {'role':'LEADER'}}, function(err) {
                if(err) {
                  console.log(err);
                }
              });
            }
          }
        });
      }
    }
  };
};



