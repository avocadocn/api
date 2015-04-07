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
var personalTeamScoreLimit = 100;
var perPageNum = 4;
module.exports = function (app) {

  return {
   
    createTeams : function(req, res) {
      //权限判断
      var companyId = req.body.companyId || req.user.cid || req.user._id;
      var role = auth.getRole(req.user, {
        companies:[companyId]
      });
      var allow = auth.auth(role,['createTeams']);
      if(!allow.createTeams) {
        return res.status(403).send({msg: '权限错误'});
      }
      var groupLevel = role.company==='hr' ? 0 : 1; //0为官方
      var createRule = {'limit':1};//暂时一人只能创建一个
      var userCanNotCreate = groupLevel===1? (req.user.score.total < personalTeamScoreLimit || req.user.established_team && req.user.established_team.length>=createRule.limit ? true: false) : false;
      if(userCanNotCreate) {
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
              Group.findOne({_id:selectedGroups[i]._id}).exec().then(function(group){
                var tname = selectedGroups[i].teamName ? selectedGroups[i].teamName : company.info.official_name + '-' + group.groupType + '队';
                var companyGroup = new CompanyGroup();
                companyGroup.cid = company._id;
                companyGroup.cname = company.info.name;
                companyGroup.gid = selectedGroups[i]._id;
                companyGroup.group_type = group.groupType;
                companyGroup.entity_type = group.entity_type;
                companyGroup.name = tname;
                companyGroup.logo = '/img/icons/group/' + group.entity_type.toLowerCase() + '_on.png';
                companyGroup.city = company.info.city;
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
                    teamId = companyGroup._id;
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
              })
              .then(null, function (err) {
                log(err);
                callback(err);
              });
            },
            function (err) {
              if(err){
                return res.status(500).send({ msg: '保存失败' });
              }
              else{
                var result = {teamId : teamId, msg: '保存成功'};
                return res.status(200).send(result);
              }
            }
          );
        }
      })
      .then(null, function (err) {
        log(err);
        return res.status(500).send({msg: '新建小队失败'});
      });
    },
    getTeam : function(req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid]
      });
      if(req.query.resultType=="simple") {
        var simpleBriefTeam = {
          _id: team._id,
          name: team.name,
          cname: team.cname,
          logo: team.logo,
          groupType: team.group_type,
          createTime: team.create_time,
          memberCount: team.member.length,
          homeCourts: team.home_court,
          score_rank: team.score_rank,
          activityScore: team.score.total,
          last_campaign: team.last_campaign,
          isCompanyTeam: team.cid.toString() ===req.user.cid.toString()
        };
        return res.status(200).send(simpleBriefTeam);
      }

      var allow = auth.auth(role,['getTeams']);
      if(!allow.getTeams) {
        return res.status(403).send({msg: '权限错误'});
      }

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
        campaignCount: team.count.total_campaign,
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
        briefTeam.isLeader = team.isLeader(req.user._id);
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
            if (team.group_type === 'virtual' || req.query.gid && req.query.gid!=team.gid ||req.query.leadFlag &&!team.leader) {
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

        //如果只要取用户的小队简单信息
        if (req.query.brief==='true') {
          req.outputOptions = {'name':1, 'logo':1}
        }

        if (!req.query.hostId || req.query.hostId === req.user._id.toString()) {
          options.cid = req.user.cid || req.user._id;
          addIdsToOptions(req.user.team);
          next();
        } else {
          User.findById(req.query.hostId).exec()
            .then(function (user) {
              if (!user) {
                res.status(404).send({msg: '用户查找失败'});
                return;
              }
              options.cid = user.cid;
              addIdsToOptions(user.team);
              next();
            })
            .then(null, function (err) {
              log(err);
              res.status(500).send({msg: '用户查找错误'});
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
              score_rank: companyGroups[i].score_rank
            };
            if(role.company=='hr'){
              briefTeam.count = companyGroups[i].count;
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
          return res.status(200).send(formatCompanyGroups);
        })
        .then(null, function (err) {
          log(err);
          console.log(err);
          res.status(500).send({msg: '小队信息获取错误'});
        });
    },
    updateTeamLogo: function (req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
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
            res.status(500).send({msg: '服务器错误'});
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
          if (!homecourt.name || !homecourt.loc || !homecourt.loc.coordinates || homecourt.loc.coordinates.length === 0) {
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
                else {
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
    },
    uploadFamilyPhotos: function (req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies: [team.cid],
        teams: [team._id]
      });
      var allow = auth.auth(role, ['editTeamFamily']);
      if (!allow.editTeamFamily) {
        res.status(403).send({ msg: '权限错误' });
        return;
      }

      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/group/family',
        subDir: team._id.toString(),
        success: function (url) {
          var uploadUser = {
            _id: req.user._id
          };
          if (req.user.provider === 'company') {
            uploadUser.name = req.user.info.name;
            uploadUser.photo = req.user.info.logo;
          } else if (req.user.provider === 'user') {
            uploadUser.name = req.user.nickname;
            uploadUser.photo = req.user.photo;
          }
          team.family.push({
            uri: path.join('/img/group/family', url),
            upload_user: uploadUser
          });
          team.save(function (err) {
            if (err) {
              log(err);
              res.status(500).send({ msg: '服务器错误' });
            } else {
              res.status(200).send({ msg: '上传成功' });
            }
          });
        },
        error: function (err) {
          log(err);
          res.status(500).send({ msg: '服务器错误' });
        }
      });

    },
    //进相册看相册数据，并非在首页取全家福
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
        return (!photo.hidden && photo.select);
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
      var chatroomIndex = tools.arrayObjectIndexOf(user.chatrooms, team._id, '_id');
      if(chatroomIndex>-1) {
        user.chatrooms.splice(chatroomIndex,1);
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
          if(req.user.getCid().toString() !== team.cid.toString()) {
            return res.status(403).send({msg:'权限错误'});
          }
          res.status(200).send({'members':team.member,'leaders':team.leader});
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
      
    },
    getSearchTeamsOptions: function (req, res, next) {
      donlerValidator({
        tid: {
          name: '小队ID',
          value: req.query.tid,
          validators: ['required']
        },
        type: {
          name: '查找类型',
          value: req.params.type,
          validators: ['required',donlerValidator.enum(['sameCity','nearbyTeam','search'])]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          CompanyGroup.findById(req.query.tid).exec()
          .then(function (companyGroup) {
            if (!companyGroup) {
              res.status(400).send({ msg: '没有找到对应的小队' });
            } else {
              req.companyGroup = companyGroup;
              if(req.params.type=='search') {
                var regx = new RegExp(req.query.key);
                Company.find({'info.name':regx,'status.active':true,'status.mail_active':true},{'_id':1,'team':1},function(err,companies){
                  if(err){
                    return res.status(500).send({msg: '查找小队错误'});
                  }else{
                    var tids=[];
                    for(var i=0;i<companies.length;i++){
                      for(var j=0;j<companies[i].team.length;j++){
                        if(companies[i].team[j].gid===companyGroup.gid){
                          tids.push(companies[i].team[j].id);
                        }
                      }
                    }
                    req.tids = tids;
                    next();
                  }
                });
              }
              else{
                next();
              }
              
            }
          })
          .then(null, function (err) {
            log(err);
            return res.status(500).send({msg: '查找小队错误'});
          });
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },
    getSearchTeams: function (req, res) {
      var searchType = req.params.type;
      var companyGroup = req.companyGroup;
      var gid = companyGroup.gid;
      var page = req.query.page > 0? req.query.page:1;
      var options = {
        'gid':req.companyGroup.gid,
        '_id':{'$ne':req.query.tid},
        'active':true
      }
      switch(searchType) {
        case 'sameCity':
          options['city.city'] = companyGroup.city.city;
          break;
        case 'nearbyTeam':
          // var homecourt = companyGroup.home_court[req.query.index];
          var latitude = parseFloat(req.query.latitude);
          var longitude = parseFloat(req.query.longitude);
          if(!latitude || !longitude)
            return res.status(400).send({msg:'缺少坐标无法查找附近的小队'});
          options['city.city'] = companyGroup.city.city;
          options['home_court'] = {'$exists':true};
          options['home_court.loc'] = {'$nearSphere':[longitude,latitude]};
          break;
        case 'search':
          var regx = new RegExp(req.query.key);
          options['$or'] =[{'_id':{'$in':req.tids}},{'name':regx}];
          break;
        default:
          return res.status(400).send({msg:'您输入的查找类型不正确！'});
      }
      CompanyGroup.paginate(options, page, perPageNum, function(err, pageCount, results, itemCount) {
        if(err){
          log(err);
          res.status(500).send({msg:err});
        }
        else{
          var formatTeams = [];
          results.forEach(function (team ) {
            if(team.score_rank && team.score_rank.rank) {
              var totalCompNum = team.score_rank.lose + team.score_rank.tie + team.score_rank.win ;
              var odds_percent = team.score_rank.win ? Math.floor(team.score_rank.win/totalCompNum*100) :0;
              formatTeams.push({
                "_id":team._id,
                "cid":team.cid,
                "cname":team.name,
                "name":team.cname,
                "logo":team.logo,
                "rank":team.score_rank.rank,
                "odds_percent": odds_percent, 
                "score":team.score_rank.score,//战绩积分
                "activity_score":team.score.total //活跃度积分
              });
            }
          });
          return res.send({'teams':formatTeams,'maxPage':pageCount});
        }
      },{columns:{'logo':1,'name':1,'cname':1,'score_rank':1,'score.total':1}, sortBy:{'score_rank.score':-1,'score.total':-1}});
    }
  };
};



