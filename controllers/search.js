'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var CompanyGroup = mongoose.model('CompanyGroup');
var User = mongoose.model('User');

// var blockWords = ['中国','上海','北京','公司'];
module.exports = function (app) {

  return {
    searchCompanies: function(req, res){
      var options = {};
      if(req.body.name) {
        var regx = new RegExp(req.body.name);
        options = {'info.name': regx, 'status.active':true};
      }else if(req.body.email) {
        var email = req.body.email;
        var domain = email.split('@')[1];
        options = {'email.domain': domain, 'status.active':true};
      }else{
        return res.status(400).send({msg:'查询条件错误'});
      }
      var companies_rst = [];
      //查找未被屏蔽的公司(未激活也返回)
      Company.find(options, function (err, companies) {
        if(err) {
          return res.send([]);
        } else {
          if(companies) {
            for(var i = 0; i < companies.length; i ++) {
              companies_rst.push({
                '_id' : companies[i]._id,
                'name' : companies[i].info.name,
                'logo' : companies[i].info.logo,
                'mail_active' :companies[i].status.mail_active
              });
            }
            return res.status(200).send(companies_rst);
          } else {
            return res.status(200).send([]);
          }
        }
      });
    },

    searchUsers: function (req, res, next) {
      var cid = req.user.getCid();
      User.find({
        cid: cid,
        mail_active: true
      }).exec()
        .then(function (users) {
          var _users = [];
          for (var i = 0; i < users.length; i++) {
            _users.push({
              '_id': users[i]._id,
              'nickname': users[i].nickname,
              'photo': users[i].photo,
              'department': users[i].department,
              'team': users[i].team
            });
            //-此处department、team 可不需要 todo -M 配合前台、以及指定队长的后台逻辑修改
          }
          //只获取公司员工
          if (!req.body.tid || req.body.tid == 'null') {
            res.send(_users);
            //还要获取某小队成员
          } else {
            CompanyGroup.findById(req.body.tid).exec()
              .then(function (team) {
                var members = team.member;
                var leaders = team.leader;
                return res.send({
                  'all_users': _users,
                  'users': members,
                  'leaders': leaders
                });
              })
              .then(null, function (err) {
                return res.send({
                  'all_users': _users,
                  'users': [],
                  'leaders': []
                });
              });
          }
        })
        .then(null, function (err) {
          next(err);
        });

    }
  }
};
