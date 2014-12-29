'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Company = mongoose.model('Company'),
  CompanyGroup = mongoose.model('CompanyGroup'),
  Campaign = mongoose.model('Campaign'),
  Group = mongoose.model('Group');

var log = require('../services/error_log.js'),
  cache = require('../services/cache/Cache'),
  auth = require('../services/auth.js'),
  uploader = require('../services/uploader.js'),
  syncData = require('../services/sync_data.js'),
  donlerValidator = require('../services/donler_validator.js'),
  userScore = require('../services/user_score.js'),
  tools = require('../tools/tools.js'),
  async = require('async');
var personalTeamScoreLimit = 10;
module.exports = function (app) {

  return {
   
    createTeams : function(req, res) {
      //权限判断
      var companyId = req.body.companyId || req.user.cid || req.user._id;
      var role = auth.getRole(req.user, {
        companies:[companyId]
      });
      var allow = auth.auth(role,['createTeams']);
      var groupLevel = role.company==='hr' ? 0 : 1; //0为官方
      var createRule = {'limit':1};//暂时一人只能创建一个
      var userCanNotCreate = groupLevel===1? (req.user.score.total < personalTeamScoreLimit || req.user.established_team && req.user.established_team.length>=createRule.limit ? true: false) : false;
      if(!allow.createTeams || userCanNotCreate) {
        return res.status(403).send({msg: '权限错误'});
      }
      //执行
      Company.findById(companyId).exec()
      .then(function (company) {
        if (!company) {
          return res.status(400).send({ msg: '没有找到对应的公司' });
        } else {
          var selectedGroups = req.body.selectedGroups;
          var i = selectedGroups.length;
          var teamId;
          async.whilst(
            function () { return i >0; },
            function (callback) {
              i--;
              var tname = selectedGroups[i].teamName ? selectedGroups[i].teamName : company.info.official_name + '-' + selectedGroups[i].groupType + '队';
              var companyGroup = new CompanyGroup();

              companyGroup.cid = company._id;
              companyGroup.cname = company.info.name;
              companyGroup.gid = selectedGroups[i]._id;
              companyGroup.group_type = selectedGroups[i].groupType;
              companyGroup.name = tname;
              companyGroup.logo = '/img/icons/group/' + selectedGroups[i].entityType.toLowerCase() + '_on.png';
              if(groupLevel===1){//个人小队保存谁发的并将此人设为队长.
                companyGroup.poster = {role: 'Personal', _id: req.user._id};
                var member = {
                  _id: req.user._id,
                  nickname: req.user.nickname,
                  photo: req.user.photo,
                  join_time: new Date()
                }
                companyGroup.leader = [];
                companyGroup.member = [];
                companyGroup.leader.push(member);
                companyGroup.member.push(member);
                companyGroup.level = 1;
              }else{
                companyGroup.poster = {role: 'HR'};
              }
              companyGroup.save(function(err) {
                if (err) {
                  log(err);
                  callback(err);
                }
                else{
                  company.team.push({
                    'gid': companyGroup.gid,
                    'group_type': companyGroup.group_type,
                    'name': companyGroup.name,
                    'id': companyGroup._id,
                    'group_level': groupLevel
                  });
                  company.save(function(err){
                    if(err){
                      log(err);
                      callback(err)
                    }else{
                      if(groupLevel===1) {//更新个人的team表
                        var _team = {
                          gid: companyGroup.gid,
                          _id: companyGroup._id,
                          group_type: companyGroup.group_type,
                          entity_type: companyGroup.entity_type,
                          name: companyGroup.name,
                          leader: true,
                          logo: companyGroup.logo
                        }
                        req.user.team.push(_team);
                        req.user.established_team.push(_team);
                        req.user.save(function(err) {
                          if(err){
                            log(err);
                            callback(err);
                          }else{
                            teamId = companyGroup._id;
                            callback(null);
                          }
                        });
                      }else{
                        callback(null);
                      }
                    }
                  });

                }
              });
            },
            function (err) {
              if(err){
                return res.status(500).send({ msg: '保存失败' });
              }
              else{
                var result = {}
                if(groupLevel===1) {
                  result.teamId = teamId;
                }
                else{
                  result.msg='保存成功';
                }
                return res.status(200).send(result);
              }
            }
          );
        }
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: '查找公司错误'});
      });
    },
    getTeam : function(req, res) {
      var team = req.companyGroup;

      var membersWithoutLeader = [];
      team.member.forEach(function (member) {
        var isLeader = false;
        for (var i = 0; i < team.leader.length; i++) {
          var leader = team.leader[i];
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
      var originFamilyPhotos = team.family.filter(function(photo){
        return !photo.hidden && photo.select;
      });
      //只需传uri
      var familyPhotos = [];
      for(var i=0;i<originFamilyPhotos.length;i++){
        familyPhotos.push({
          uri:originFamilyPhotos[i].uri
        });
      }
      var briefTeam = {
        _id: team._id,
        name: team.name,
        cname: team.cname,
        logo: team.logo,
        groupType: team.group_type,
        createTime: team.create_time,
        brief: team.brief,
        leaders: team.leader,
        members: membersWithoutLeader.slice(0, 6 - team.leader.length),
        memberCount: team.member.length,
        // campaignCount: team.score.campaign/10,
        homeCourts: team.home_court,
        cid: team.cid,
        familyPhotos: familyPhotos,
        score: team.score,
        officialTeam: team.poster.role=='Personal' ? false : true
      };
      if(team.poster.role=='Personal') {
        briefTeam.poster = {
          _id:team.poster._id._id,
          nickname: team.poster._id.nickname,
          photo: team.poster._id.photo
        }
        briefTeam.level = team.level;
      }
      // 判断用户是否加入了该小队
      if (req.user.provider === 'user') {
        briefTeam.hasJoined = team.hasMember(req.user._id);
      }
      return res.status(200).send(briefTeam);
    },

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

    getTeamsSetQueryOptions: function (req, res, next) {
      var options = {
        gid: {'$ne':'0'}
      };
      if(req.query.personalFlag=='true') {
        options['poster.role'] ='Personal';
      }
      else if(req.query.personalFlag!=undefined) {
        options['poster.role'] ='HR';
      }
      req.options = options;
      switch (req.query.hostType) {
      case 'company':
        options.cid = req.query.hostId || req.user.cid || req.user._id;
        if (req.user.provider === 'user') {
          options.active = true;
        }
        next();
        break;
      case 'user':

        var addIdsToOptions = function (userTeams) {
          var teams = userTeams.filter(function (team) {
            if (team.group_type === 'virtual' || req.body.gid && req.body.gid!=team.gid ||req.body.leadFlag &&!team.leader) {
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

        if (!req.query.hostId || req.query.hostId === req.user._id.toString()) {
          addIdsToOptions(req.user.team);
          next();
        } else {
          User.findById(req.query.hostId).exec()
            .then(function (user) {
              if (!user) {
                res.sendStatus(404);
                return;
              }
              addIdsToOptions(user.team);
              next();
            })
            .then(null, function (err) {
              log(err);
              res.sendStatus(500);
            });
        }
        break;
      }
    },

    getTeams: function(req, res) {
      CompanyGroup
        .find(req.options)
        .populate('poster._id')
        .sort('-score.total')
        .exec()
        .then(function (companyGroups) {
          var formatCompanyGroups = [];
          for (var i = 0; i < companyGroups.length; i++) {
            var membersWithoutLeader = [];
            companyGroups[i].member.forEach(function (member) {
              var isLeader = false;
              for (var j = 0; j < companyGroups[j].leader.length; j++) {
                var leader = companyGroups[j].leader[j];
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
              name: companyGroups[i].name,
              cname: companyGroups[i].cname,
              logo: companyGroups[i].logo,
              groupType: companyGroups[i].group_type,
              createTime: companyGroups[i].create_time,
              brief: companyGroups[i].brief,
              leaders: companyGroups[i].leader,
              members: membersWithoutLeader.slice(0, 6 - companyGroups[i].leader.length),
              memberCount: companyGroups[i].member.length,
              homeCourts: companyGroups[i].home_court,
              cid: companyGroups[i].cid,
              familyPhotos: familyPhotos,
              lastCampaign: companyGroups[i].last_campaign,
              score: companyGroups[i].score,
              officialTeam: companyGroups[i].poster.role=='Personal' ? false : true
            };
            if(companyGroups[i].poster.role=='Personal') {
              briefTeam.poster = {
                _id:companyGroups[i].poster._id._id,
                nickname: companyGroups[i].poster._id.nickname,
                photo: companyGroups[i].poster._id.photo
              }
              briefTeam.level = companyGroups[i].level;
            }
            // 判断用户是否加入了该小队
            if (req.user.provider === 'user') {
              briefTeam.hasJoined = companyGroups[i].hasMember(req.user._id);
            }
            formatCompanyGroups.push(briefTeam);
          }
          return res.status(200).send(formatCompanyGroups);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    updateTeamLogo: function (req, res, next) {
      if (req.headers['content-type'] !== 'multipart/form-data') {
        next();
        return;
      }
      uploader.uploadImg(req, {
        fieldName: 'logo',
        targetDir: '/public/img/group/logo',
        success: function (url, oriName) {
          req.companyGroup.logo = path.join('/img/group/logo', url);
          req.isUpdateLogo = true;
          next();
        },
        error: function (err) {
          if (err.type === 'notfound') {
            next();
          } else {
            res.sendStatus(500);
          }
        }
      });
    },
    editTeamData : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['editTeamCampaign']);
      if(!allow.editTeamCampaign){
        return res.status(403).send({msg: '权限错误'});
      }
      if(req.body.name){
        team.name = req.body.name;
      }
      if(req.body.brief){
        team.brief = req.body.brief;
      }
      if(req.body.homeCourt){
        var homecourts = req.body.homecourt;
        homecourts.forEach(function (homecourt) {
          if (!homecourt.loc || !homecourt.loc.coordinates || homecourt.loc.coordinates.length === 0) {
            delete homecourt.loc;
          }
        });
        team.home_court = homecourts;
      }
      team.save(function(err){
        if(err){
          log(err);
          return res.status(500).send({msg:'保存错误'});
        }
        else{
          res.status(200).send({msg:'成功'});

          if (req.isUpdateLogo) {
            syncData.updateTlogo(team._id);
          }
          if (req.body.name) {
            syncData.updateTname(team._id);
          }
        }
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
        team.active = false;
        team.save(function(err){
          if(err){
            log(err);
            return res.status(500).send({msg:'保存错误'});
          }
          else{
            return res.status(200).send({msg:'成功'});
          }
        })
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
        team.active = true;
        team.save(function(err){
          if(err){
            log(err);
            return res.status(500).send({msg:'保存错误'});
          }
          else{
            return res.status(200).send({msg:'成功'});
          }
        })
      }
    },
    uploadFamilyPhotos : function(req, res) {
      //上传 todo
    },
    getFamilyPhotos : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['visitPhotoAlbum']);
      if(!allow.visitPhotoAlbum){
        return res.status(403).send({msg: '权限错误'});
      }
      var originFamilyPhotos = team.family.filter(function(photo){
        return !photo.hidden;
      });
      var familyPhotos = [];
      for(var i=0;i<originFamilyPhotos.length;i++){
        familyPhotos.push({
          _id: originFamilyPhotos[i]._id,
          uri: originFamilyPhotos[i].uri,
          select: originFamilyPhotos[i].select
        });
      }
      return res.status(200).send(familyPhotos);
    },
    toggleSelectFamilyPhoto : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['editTeam']);
      if(!allow.editTeam){
        return res.status(403).send({msg: '权限错误'});
      }
      for (var i = 0; i < team.family.length; i++) {
        if (team.family[i]._id.toString() === req.params.familyPhotoId) {
          if (!team.family[i].select) {
            team.family[i].select = true;
          } else {
            team.family[i].select = false;
          }
          break;
        }
      }
      team.save(function(err) {
        if (err) {
          log(err);
          return res.status(500).send({msg:'保存错误'});
        }
        return res.status(200).send({msg:'成功'});
      });
    },
    deleteFamilyPhoto : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid],
        teams:[req.params.teamId]
      });
      var allow = auth.auth(role,['editTeam']);
      if(!allow.editTeam){
        return res.status(403).send({msg: '权限错误'});
      }
      for (var i = 0; i < team.family.length; i++) {
        if (team.family[i]._id.toString() === req.params.familyPhotoId) {
          team.family[i].hidden = true;
          break;
        }
      }
      team.save(function(err) {
        if (err) {
          log(err);
          return res.status(500).send({msg:'保存错误'});
        }
        return res.status(200).send({msg:'成功'});
      });
    },
    joinTeam : function(req, res) {
      var user = req.resourceUser;
      var team = req.companyGroup;
      var requestRole = auth.getRole(req.user, {
        companies:[user.getCid()],
        users:[req.params.userId]
      });
      var requestAllow = auth.auth(requestRole,['joinTeamOperation']);
      if(!requestAllow.joinTeamOperation){
        return res.status(403).send({msg: '权限错误'});
      }
      if(team.memberLimit>0 &&team.memberLimit<= team.member.length){
        return res.status(400).send({msg: '小队人数已经达到上限'});
      }
      var resourceRole = auth.getRole(user,{
        companies:[user.getCid()],
        teams:[team._id],
      });
      var resourceAllow = auth.auth(resourceRole, ['joinTeam'])
      if(!resourceAllow.joinTeam){
        return res.status(400).send({msg: '已加入'});
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
        companies:[user.getCid()],
        teams:[team._id]
      });
      var resourceAllow = auth.auth(resourceRole, ['quitTeam'])
      if(!resourceAllow.quitTeam){
        return res.status(400).send({msg: '未参加此小队'});
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

    },
    getTeamTags : function(req, res) {
      Campaign.aggregate()
      .project({"tags":1,"tid":1})
      .match({'tid' : mongoose.Types.ObjectId(req.params.teamId)})//可在查询条件中加入时间
      .unwind("tags")
      .group({_id : "$tags", number: { $sum : 1} })
      .sort({number:-1})
      .limit(10)
      .exec(function(err,results){
        if (err) {
          log(err);
          return res.status(500).send({msg:'获取tag错误'});
        }
        else{
          var tags = [];
          for(var i=0; i<results.length; i++){
            tags.push(results[i]._id);
          }
          return res.status(200).send(tags);
        }
      });
    },
    getGroups: function (req, res) {
      if (!req.user) {
        return res.status(403).send({msg: '权限错误'});
      }
      Group.find(null, function (err, group) {
        if (err) {
          log(err);
          return res.status(500).send({msg: 'group寻找错误'});
        }
        var _length = group.length;
        var groups = [];
        for (var i = 0; i < _length; i++) {
          if (group[i]._id !== '0') {
            groups.push({
              '_id': group[i]._id,
              'groupType': group[i].group_type, //中文
              'entityType': group[i].entity_type //英文
              // 'icon': group[i].icon//暂时无值，到前端需用entityType来取icon
            });
          }
        }
        return res.status(200).send(groups);
      });
    },

    getMembers: function (req, res) {
      CompanyGroup.findById(req.params.teamId).exec()
        .then(function (team) {
          if (!team) {
            res.sendStatus(404);
            return;
          }
          res.status(200).send(team.member);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    getLedTeams: function(req, res) {
      var options = {'cid':req.user.cid,'gid':req.query.gid || {'$ne':'0'},'leader._id':req.user._id};
      CompanyGroup.find(options,{'logo':1,'cid':1,'name':1},function(err, companyGroups){
        if(err){
          console.log(err);
          return res.status(500).send({'msg':'获取带领小队失败'});
        }
        else
         return res.send(companyGroups);
      });
    },
    updatePersonalTeam: function(req, res) {
      var team = req.companyGroup;
      if(!team.poster._id) {
        return res.status(400).send({msg:'该小队为官方小队无法进行升级'});
      }
      var requestRole = auth.getRole(req.user, {
        teams:[team._id]
      });
      var requestAllow = auth.auth(requestRole,['updateTeam']);
      if(!requestAllow.updateTeam){
        return res.status(403).send({msg: '您没有权限进行升级'});
      }
      var score = req.user.score.total;
      if(team.updateLevel(score)){
        team.save(function(err){
          if(!err) {
            return res.send({msg:'小队升级成功',level:team.level});
          }
          else {
            return res.status(400).send({msg:'小队升级失败'});
          }
        })
      }
      else {
        return res.status(403).send({msg:'您的积分不足，无法进行升级'});
      }
      
    }


  };
};

