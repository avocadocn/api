'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Group = mongoose.model('Group');

var log = require('../services/error_log.js'),
    auth = require('../services/auth.js');

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
    editTeamData : function(req, res) {
      console.log(req.body);
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
      if(req.body.logo){
        // team.logo = req.body.logo;
        // logo todo
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
          return res.status(200).send({msg:'成功'});
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
      var originFamilyPhotos = team.family.filter(function(photo){
        return !photo.hidden ;
      });
      var familyPhotos = [];
      for(var i=0;i<originFamilyPhotos.length;i++){
        familyPhotos.push({
          _id: team.family[i]._id,
          uri: team.family[i].uri,
          select: team.family[i].select
        });
      }
      return res.status(200).send(familyPhotos);
    },
    toggleSelectFamilyPhoto : function(req, res) {
      return;
    },
    deleteFamilyPhoto : function(req, res) {
      return;
    },
    joinTeam : function(req, res) {
      return;
    },
    quitTeam : function(req, res) {
      return;
    }
  }
}