'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Group = mongoose.model('Group'),
    Campaign = mongoose.model('Campaign'),
    Group = mongoose.model('Group');

var log = require('../services/error_log.js'),
    auth = require('../services/auth.js'),
    uploader = require('../services/uploader.js'),
    syncData = require('../services/sync_data.js'),
    tools = require('../tools/tools.js');

module.exports = function (app) {

  return {
   
    createTeams : function(req, res) {
      var role = auth.getRole(req.user, {
        companies:[req.body.companyId]
      });
      var allow = auth.auth(role,['createTeams']);
      if(!allow.createTeams){
        return res.status(403).send({msg: '权限错误'});
      }
      Company.findById(req.body.companyId).exec()
      .then(function (company) {
        if (!company) {
          return res.status(400).send({ msg: '没有找到对应的公司' });
        } else {
          var selectedGroups = req.body.selectedGroups;
          for (var i = 0; i < selectedGroups.length; i++) {
            var tname = selectedGroups[i].teamName ? selectedGroups[i].teamName : company.info.official_name + '-' + selectedGroups[i].groupType + '队';
            var companyGroup = new CompanyGroup();

            companyGroup.cid = company._id;
            companyGroup.cname = company.info.name;
            companyGroup.gid = selectedGroups[i]._id;
            companyGroup.group_type = selectedGroups[i].groupType;
            companyGroup.name = tname;
            companyGroup.logo = '/img/icons/group/' + selectedGroups[i].entityType.toLowerCase() + '_on.png';

            companyGroup.save(function(err) {
              if (err) {
                log(err);
                return res.status(500).send({msg:'保存小队失败'});
              }
            });

            company.team.push({
              'gid': selectedGroups[i]._id,
              'group_type': selectedGroups[i].groupType,
              'name': tname,
              'id': companyGroup._id
            });
            company.save(function(err){
              if(err){
                log(err);
                return res.status(500).send({msg:'保存公司失败'});
              }else{
                return res.status(200).send({msg:'保存成功'});
              }
            });
          }
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
        name: team.name,
        cname: team.cname,
        logo: team.logo,
        groupType: team.group_type,
        createTime: team.create_time,
        brief: team.brief,
        leaders: team.leader,
        members: membersWithoutLeader.slice(0, 6 - team.leader.length),
        // memberCount: team.member.length,
        homeCourts: team.home_court,
        cid: team.cid,
        familyPhotos: familyPhotos
      };
      return res.status(200).send(briefTeam);
    },
    getTeams : function(req, res) {
      var option = {
        'cid':req.query.companyId || req.user.cid || req.user._id
      };
      if(req.user.provider=='user'){
        option.active = true;
      }
      CompanyGroup
      .find(option)
      .exec()
      .then(function(companyGroups) {
        var formatCompanyGroups = [];
        for(var i = companyGroups.length-1; i>=0; i-- ) {
          var membersWithoutLeader = [];
          companyGroups[i].member.forEach(function (member) {
            var isLeader = false;
            for (var i = 0; i < companyGroups[i].leader.length; i++) {
              var leader = companyGroups[i].leader[i];
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
          var originFamilyPhotos = companyGroups[i].family.filter(function(photo){
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
            familyPhotos: familyPhotos
          };
          formatCompanyGroups.push(briefTeam);
        }
        return res.status(200).send(formatCompanyGroups);
      })
      .then(null, function(err) {
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
        team.save(function(err){
          if(err){
            log(err);
            return res.status(500).send({msg:'保存错误'});
          }else{
            user.save(function (uErr){
              if(uErr){
                log(uErr);
                return res.status(500).send({msg:'保存错误'});
              }
              return res.status(200).send({msg:'加入成功'});
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
          user.save(function (uErr){
            if(uErr){
              log(uErr);
              return res.status(500).send({msg:'保存错误'});
            }
            return res.status(200).send({msg:'退出成功'});
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
    getGroups : function(req, res) {
      if(req.user.provider!=='company'){
        return res.status(403).send({msg: '权限错误'});
      }
      Group.find(null, function(err,group){
        if (err) {
          log(err);
          return res.status(500).send({msg: 'group寻找错误'});
        }
        var _length = group.length;
        var groups = [];
        for(var i = 0; i < _length; i++) {
          if(group[i]._id!=='0'){
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
    }
  }
}