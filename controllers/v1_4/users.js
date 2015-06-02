'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');
var Photo = mongoose.model('Photo');
var Comment = mongoose.model('Comment');

var jwt = require('jsonwebtoken');
var log = require('../../services/error_log.js');
var tokenService = require('../../services/token.js');
var donlerValidator = require('../../services/donler_validator.js');
var validator = require('validator');
var emailService = require('../../services/email.js');
var uploader = require('../../services/uploader.js');
var auth = require('../../services/auth.js');
var tools = require('../../tools/tools.js');
var syncData = require('../../services/sync_data.js');
var async = require('async');
var publicDomain = require('../../services/public_domain.js');

module.exports = function (app) {

  return {
    //屏蔽
    close: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.resourceUser.cid],
        users: [req.resourceUser._id]
      });
      var allow = auth.auth(role, ['closeUser']);
      if (!allow.closeUser) {
        res.sendStatus(403);
        return;
      }

      req.resourceUser.active = false;
      req.resourceUser.timeHash = new Date();
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });

    },

    //取消屏蔽
    open: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.resourceUser.cid],
        users: [req.resourceUser._id]
      });
      var allow = auth.auth(role, ['openUser']);
      if (!allow.openUser) {
        res.sendStatus(403);
        return;
      }

      req.resourceUser.active = true;
      req.resourceUser.timeHash = new Date();
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });
    },
    //激活
    activeUser: function (req, res, next) {
      var srcUser = req.resourceUser;
      var role = auth.getRole(req.user, {
        companies: [srcUser.cid]
      });
      var allow = auth.auth(role, ['activeUser']);
      if (!allow.activeUser) {
        res.status(403).send({ msg: '您没有权限' });
        return;
      }

      srcUser.mail_active = true;
      srcUser.active = true;
      srcUser.timeHash = new Date();
      srcUser.save(function (err) {
        if (err) {
          next(err);
          return;
        }
        res.send({ msg: '激活成功' });
      });
    },
    update: function (req, res) {
      var user = req.resourceUser;
      if (req.body.nickname) {
        user.nickname = req.body.nickname;
      }
      if (req.body.password) {
        if(user.authenticate(req.body.originPassword)) user.password = req.body.password;
        else
          return res.status(400).send({msg:'原密码填写错误'});
      }
      if (req.body.realname) {
        user.realname = req.body.realname;
      }
      if (req.body.phone) {
        user.phone = req.body.phone;
      }
      if (req.body.qq) {
        user.qq = req.body.qq;
      }
      if (req.body.birthday) {
        user.birthday = new Date(req.body.birthday);
      }
      if (req.body.pushToggle!==null) {
        user.push_toggle = req.body.pushToggle;
      }
      if (req.body.introduce!==null) {
        user.introduce = req.body.introduce;
      }
      if(req.body.tag) {
        var tag = req.body.tag;
        if(user.tags.indexOf(tag)===-1) user.tags.push(tag);
      }
      if(req.body.deleteTag) {
        var tag = req.body.deleteTag;
        var index = user.tags.indexOf(tag);
        if(index>-1) user.tags.splice(index, 1);
      }
      if(req.body.sex) {
        user.sex = req.body.sex;
      }
      user.timeHash = new Date();
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        if(req.body.did && (!user.department || !user.department._id || user.department._id.toString()!= req.body.did)) {
          departmentController(app).joinDepartment(user,req.body.did,function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
              return;
            }
            else {
              res.sendStatus(200);
            }
          });
        }
        else {
          res.sendStatus(200);
        }

        if (req.updatePhoto) {
          syncData.updateUlogo(user._id);
        }
        if (req.body.nickname) {
          syncData.updateUname(user._id);
        }
      });
    },
    getCompanyUsers: function (req, res) {
      //resultType :1仅nickname，photo
      //2: username,photo,realname,department,team,campaignCount,score
      //3:待激活用户
      var findOptions = {'cid':req.params.companyId, 'mail_active':true};
      if(req.query.timehash) {
        console.log(new Date(parseInt(req.query.timehash)));
        findOptions.timeHash = {'$gt': new Date(parseInt(req.query.timehash))};
      } else {
        findOptions.active = true;
      }
      var outputOptions = {};
      if(req.user.provider==='company') { 
        if(req.user._id.toString() !== req.params.companyId) return res.sendStatus(403);
        else {
          //hr取来任命队长用
          if(!req.query.resultType || req.query.resultType=='1'){
            outputOptions = {'email':1,'nickname':1,'photo':1,'realname': 1, 'timeHash': 1, 'active': 1};
          }
          //hr统计用户
          else if (req.query.resultType=='2'){
            findOptions = {'cid':req.params.companyId};
            outputOptions = {'nickname':1,'photo':1,'username':1,'sex': 1,'phone':1,'qq':1,'introduce': 1,'realname':1,'department':1,'team':1,'campaignCount':1,'score':1,'active':1,'mail_active':1};
          }
          //待激活用户
          else if (req.query.resultType=='3') {
            findOptions = {'cid':req.params.companyId, 'active':false,'invited':{"$ne":true}};
            outputOptions = {'username':1,'register_date':1,'mail_active':1, 'nickname':1};
          }else if (req.query.resultType=='4') {
            findOptions = {'cid':req.params.companyId, 'active':false, 'mail_active':false};
            outputOptions = {'_id':1};
          }
        }
      }
      else if(req.user.cid.toString() !== req.params.companyId){
        return res.sendStatus(403);
      }else{
        // 用户取来通讯录用及获取公司成员用
        // 获取常用的几个属性，尽管前端可能只需要其中的一部分
        outputOptions = {'email':1, 'nickname':1, 'photo': 1, 'realname': 1, 'timeHash': 1, 'active': 1};
      }
      if(req.query.page) {
        var pageNum = 10;
        var page = req.query.page;
        User.paginate(findOptions, page, pageNum, function(err, pageCount, results, itemCount) {
          if(err){
            log(err);
            res.status(500).send({msg:err});
          }
          else{
            if (req.query.resultType=='2'){
              results.forEach(function (user) {
                var index = tools.arrayObjectIndexOf(user.team,'0','gid')
                if(index>-1){
                  user.team.splice(index,1);
                }
              })
            }
            return res.send({'users':results,'maxPage':pageCount,'hasNext':pageCount>page});
          }
        },{columns:outputOptions, sortBy:{'nickname':1}});
      }
      else{
        User.find(findOptions, outputOptions)
        .sort('nickname')
        .exec()
        .then(function (users){
          if (req.query.resultType == '2') {
            users.forEach(function(user) {
              var index = tools.arrayObjectIndexOf(user.team, '0', 'gid')
              if (index > -1) {
                user.team.splice(index, 1);
              }
            })
          }

          return res.status(200).send(users);
        })
        .then(null, function (err){
          log(err);
          return res.status(500).send({msg:'查询错误'});
        })
      }

    }
  };
};





