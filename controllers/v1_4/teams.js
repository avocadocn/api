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

          //- set the query conditon of team's company
          options.cid = req.user.cid || req.user._id;
          
          //- set the query condition of team's type
          if(req.query.gid) {
            options.gid = req.query.gid;
          }
          //- set the query condition of team leader
          if(req.query.leadFlag) {
            options.leader = {
              '$elemMatch': {
                '_id': req.query.hostId || req.user._id
              }
            };
          }
          //- set the query conditions of team member
          options.member = {
            '$elemMatch': {
              '_id': req.query.hostId || req.user._id
            }
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

          next();
          // var addIdsToOptions = function(userTeams) {
          //   var teams = userTeams.filter(function(team) {
          //     if (team.group_type === 'virtual' || req.query.gid && req.query.gid != team.gid || req.query.leadFlag && !team.leader) {
          //       return false;
          //     } else {
          //       return true;
          //     }
          //   });
          //   var tids = tools.flatCollect(teams, '_id');
          //   options._id = {
          //     $in: tids
          //   };
          // };
          
          // 
          // if (!req.query.hostId || req.query.hostId === req.user._id.toString()) {
          //   options.cid = req.user.cid || req.user._id;
          //   addIdsToOptions(req.user.team);
          //   next();
          // } else {
          //   User.findById(req.query.hostId).exec()
          //     .then(function(user) {
          //       if (!user) {
          //         res.status(404).send({
          //           msg: '用户查找失败'
          //         });
          //         return;
          //       }
          //       options.cid = user.cid;
          //       addIdsToOptions(user.team);
          //       next();
          //     })
          //     .then(null, function(err) {
          //       log(err);
          //       res.status(500).send({
          //         msg: '用户查找错误'
          //       });
          //     });
          // }
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
            //- update the relative user's team status(active -> false)
            User.update({
              'cid': req.user.id, // HR 
              'team': {
                '$elemMatch': {
                  '_id': req.companyGroup._id.toString()
                }
              }
            }, {
              '$set': {
                'team.$.active': false
              }
            }, {
              multi: true
            }, function(err) {
              if (err) {
                log(err);
              }
            });
            //- TODO simplify the following execsql statementes.
            //
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

            //- update the relative user's team status(active -> true)
            User.update({
              'cid': req.user.id,
              'team': {
                '$elemMatch': {
                  '_id': req.companyGroup.id
                }
              }
            }, {
              '$set': {
                'team.$.active': true
              }
            }, {
              multi: true
            }, function(err) {
              if (err) {
                log(err);
              }
            });
            //- TODO Maybe, there's something wrong with the following execsql.
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
    },
    editTeamData : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['editTeam','appointLeader']);
      if(!allow.editTeam){
        return res.status(403).send({msg: '权限错误'});
      }

      var teamNameChanged = false;
      if(req.body.name){
        if(team.name!==req.body.name){
          team.name = req.body.name;
          teamNameChanged = true;
        }
      }
      if(req.body.brief){
        team.brief = req.body.brief;
      }
      if(req.body.homeCourts){
        var homecourts = req.body.homeCourts || [];
        for(var i=homecourts.length-1; i>=0; i--) {
          var homecourt = homecourts[i];
          homecourts[i].loc = {coordinates: homecourts[i].coordinates || homecourts[i].loc.coordinates}; // 可能未修改。。。格式仍与原来同。
          homecourts[i].coordinates = null;
          if (!homecourts[i].name || !homecourts[i].loc || !homecourts[i].loc.coordinates || homecourts[i].loc.coordinates.length === 0) {
            homecourts.splice(i,1);
          }
        }
        team.home_court = homecourts;
      }


      //更新个人资料接口
      /**
       * [updateLeader description]
       * @param  {string}  uid            用户Id
       * @param  {Boolean} isOriginLeader 是否是原来的队长
       * @param  {Object}  team           小队
       * @return {Function}callback            
       */
      var updateLeader = function (uid, isOriginLeader, team,callback) {
        callback = callback || function () {};
        User.findOne({_id:uid},function(err, user){
          if(err){
            log(err);
            callback(err);
          }else{
            if(isOriginLeader){//如果被撤销了队长，把那个队的leader设为false
              var index = tools.arrayObjectIndexOf(user.team, team._id, '_id');
              if(index!==-1){
                user.team[index].leader = false;
              }
              //如果一个队的队长都不是了,就贬为平民T^T
              var index = tools.arrayObjectIndexOf(user.team, true, 'leader');
              if(index===-1){
                user.role = 'EMPLOYEE';
                var companyChatroomIndex = tools.arrayObjectIndexOf(user.chatrooms, user.cid,'_id');
                user.chatrooms.splice(companyChatroomIndex,1);
              }
            }else{//如果被任命了
              if(user.role ==='EMPLOYEE') {
                user.chatrooms.push({'_id':user.cid, 'join_time':new Date(), 'read_time': new Date()});
              }
              user.role = 'LEADER';
              var index = tools.arrayObjectIndexOf(user.team, team._id, '_id');
              if(index>-1){//如果本来就在这个队
                user.team[index].leader = true;//把leader属性置true
              }else{//不在这个队就加到teams里去
                user.team.push({
                  gid: team.gid,
                  _id: team._id,
                  group_type: team.group_type,
                  entity_type: team.entity_type,
                  name: team.name,
                  leader: true,
                  logo: team.logo
                });
                user.chatrooms.push({'_id':team._id, 'join_time':new Date(), 'read_time': new Date()});
              }
              //把小队资料改了
              var index = tools.arrayObjectIndexOf(team.member ,uid ,'_id');
              var memberFormat = {
                _id: uid,
                nickname: user.nickname,
                photo: user.photo
              }
              if(index === -1){
                team.member.push(memberFormat);
                team.leader =[memberFormat]; //目前仅为一个队长
              }
              else{
                team.leader = [team.member[index]];//为了保证join_time属性正确.目前仅为一个队长
              }
            }
            callback();
            user.save(function(err){
              if(err) log(err);
            });
          }
        });
      };
      var leader = req.body.leader;
      var saveTeam = function (error) {
        if(error) {
          log(err);
          return res.status(500).send({msg:'保存错误'});
        }
        team.timeHash = new Date();
        team.save(function(err){
          if(err){
            log(err);
            return res.status(500).send({msg:'保存错误'});
          }
          else{
            res.status(200).send({msg:'成功'});
            //- TODO: simplify updateTlogo and updateTname function
            if (req.isUpdateLogo) {
              syncData.updateTlogo(team._id);
            }
            if (teamNameChanged) {
              syncData.updateTname(team._id);
            }
          }
        });
      }
      if(leader){
        if(!allow.appointLeader) {
          return res.status(403).send({msg: '权限错误'});
        }
        //如果有原来的人把原来的那个人的资料改了
        if(team.leader&&team.leader.length>0) {
          for(var i=0; i<team.leader.length; i++) {
            updateLeader(team.leader[i]._id, true, team);
          }
        }
        //把新队长资料改了
        updateLeader(req.body.leader._id, false, team,saveTeam);
      }
      else {
        saveTeam();
      }
    },
    joinTeam : function(req, res) {
      var user = req.resourceUser;
      var team = req.companyGroup;
      var requestRole = auth.getRole(req.user, {
        companies:[team.cid],
        users:[req.params.userId]
      });
      var requestAllow = auth.auth(requestRole,['joinTeamOperation']);
      if(!requestAllow.joinTeamOperation){
        return res.status(403).send({msg: '权限错误'});
      }
      if(team.memberLimit>0 &&team.memberLimit<= team.member.length){
        return res.status(400).send({msg: '小队人数已经达到上限'});
      }
      var resourceRole = auth.getRole(user, {
        companies: [team.cid],
        teams: [team._id]
      });
      var resourceAllow = auth.auth(resourceRole, ['joinTeam'])
      if(!resourceAllow.joinTeam){
        return res.status(400).send({msg: '已参加'});
      }else{
        team.member.push({
          '_id':user._id,
          'nickname':user.nickname,
          'photo':user.photo
        });
        var memberScore = team.score.member;
        memberScore = (memberScore == undefined || memberScore == null) ? 10 : memberScore + 10;
        team.score.member = memberScore;
        user.team.push({
          '_id' : team._id,
          'gid': team.gid,
          'group_type': team.group_type,
          'entity_type': team.entity_type,
          'name':team.name,
          'logo':team.logo
        });

        user.chatrooms.push({'_id':team._id, 'join_time':new Date(), 'read_time':new Date()});
        team.timeHash = new Date();
        team.save(function (err) {
          if (err) {
            log(err);
            return res.status(500).send({msg:'保存错误'});
          } else {
            userScore.addScore(user, {
              joinOfficialTeam: 1
            }, {
              save: false
            }, function (err, user) {
              if (err) {
                log(err);
                return;
              }

              user.save(function (uErr){
                if(uErr){
                  log(uErr);
                  return res.status(500).send({msg:'保存错误'});
                }
                return res.status(200).send({msg:'加入成功'});
              });

            });
          }
        });
      }
    },
    quitTeam : function(req, res) {
      var user = req.resourceUser;
      var team = req.companyGroup;
      var requestRole = auth.getRole(req.user, {
        companies:[user.getCid()],
        users:[req.params.userId]
      });
      var allow = auth.auth(requestRole,['quitTeamOperation']);
      if(!allow.quitTeamOperation){
        return res.status(403).send({msg: '权限错误'});
      }
      var resourceRole = auth.getRole(user,{
        companies:[team.cid],
        teams:[team._id]
      });
      var resourceAllow = auth.auth(resourceRole, ['quitTeam'])
      if(!resourceAllow.quitTeam){
        return res.status(403).send({msg: resourceRole.team==='leader'?'队长无退出小队，请与hr联系':'您没有参加该小队'});
      }
      //对team操作
      var memberIndex = tools.arrayObjectIndexOf(team.member,user._id,'_id');
      team.member.splice(memberIndex,1);
      var memberScore = team.score.member;
      memberScore = (memberScore == undefined || memberScore == null) ? 0 : memberScore + 10;
      team.score.member = memberScore;

      var leaderIndex = tools.arrayObjectIndexOf(team.leader,user._id,'_id');
      if(leaderIndex>-1){
        team.leader.splice(leaderIndex,1);
      }
      //修改user.role的逻辑部分
      //看他是不是这个队队长
      if(resourceRole.team==='leader'){
        //看他是不是其它队的队长
        var tids = [];
        for(var i =0; i<user.team.length;i++){
          if(user.team[i]._id.toString()!==team._id){
            tids.push(user.team[i]._id);
          }
        }
        var otherRole = auth.getRole(user, {
          teams: tids
        });
        //如果不是
        if(otherRole.team!=='leader'){
          user.role = 'EMPLOYEE';
        }
      }

      //对user操作
      var teamIndex = tools.arrayObjectIndexOf(user.team,team._id,'_id');
      if(teamIndex>-1){
        user.team.splice(teamIndex,1);
      }
      var chatroomIndex = tools.arrayObjectIndexOf(user.chatrooms, team._id, '_id');
      if(chatroomIndex>-1) {
        user.chatrooms.splice(chatroomIndex,1);
      }
      team.timeHash = new Date();
      team.save(function(err){
        if(err){
          log(err);
          return res.status(500).send({msg:'保存错误'});
        }else{

          userScore.addScore(user, {
            quitOfficialTeam: 1
          }, {
            save: false
          }, function (err, user) {
            if (err) {
              log(err);
              return;
            }

            user.save(function (uErr){
              if(uErr){
                log(uErr);
                return res.status(500).send({msg:'保存错误'});
              }
              return res.status(200).send({msg:'退出成功'});
            });

          });

        }
      });
    }
  };
};



