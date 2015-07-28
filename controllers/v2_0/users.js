'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var log = require('../../services/error_log.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    tools = require('../../tools/tools.js');
var publicDomain = require('../../services/public_domain.js');
var emailService = require('../../services/email.js');
module.exports = {
    registerValidate: function (req, res, next) {
      var isUsedEmail = function (name, value, callback) {
        User.findOne({ email: value }).exec()
          .then(function (user) {
            if (user) {
              callback(false, '该邮箱已被注册');
              return;
            }
            callback(true);
          })
          .then(null, function (err) {
            log(err);
            callback(false, '服务器错误');
          });
      };

      var validateDomain = function (name, value, callback) {
        if (req.company.email.domain.indexOf(value) === -1) {
          callback(false, '邮箱后缀与公司允许的后缀不一致');
        } else {
          callback(true);
        }
      };


      // var validateDepartment = function (name, value, callback) {
      //   if (!value) {
      //     callback(true);
      //     return;
      //   }
      //   var departments = req.company.department;
      //   for (var i = 0; i < value.length; i++) {
      //     var index = tools.arrayObjectIndexOf(departments, value[i], 'name');
      //     if (index === -1) {
      //       callback(false, '公司没有开设该部门');
      //       return;
      //     } else {
      //       departments = departments[index].department;
      //     }
      //   }
      //   callback(true);
      // };
      var validateInviteKey = function (name, value, callback) {
        var domain = value.email.split('@')[1];
        if(!publicDomain.isPublicDomain(domain) || value.company.invite_key === value.inviteKey) {
          callback(true);
        }
        else {
          callback(false,'激活码错误');
        }
      }
      var email = req.body.email.toLowerCase();
      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required']
        },
        email: {
          name: '企业邮箱',
          value: email,
          validators: ['required', 'email', isUsedEmail]
        },
        domain: {
          name: '邮箱后缀',
          value: email.split('@')[1],
          validators: [validateDomain]
        },
        nickname: {
          name: '昵称',
          value: req.body.nickname,
          validators: ['required', donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        gender: {
          name: '性别',
          value: req.body.gender,
          validators: ['required']
        },
        // department: {
        //   name: '部门',
        //   value: req.body.department,
        //   validators: [validateDepartment]
        // },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: []
        }, 
        invite_key: {
          name: '邀请码',
          value: {inviteKey:req.body.inviteKey, email: email, company:req.company},
          validators: [validateInviteKey]
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    register: function (req, res) {
      var email = req.body.email.toLowerCase();
      var user = new User({
        email: email,
        username: email,
        cid: req.company._id,
        cname: req.company.info.name,
        nickname: req.body.nickname,
        password: req.body.password,
        gender: !!req.body.gender,
        phone: req.body.phone,
        role: 'EMPLOYEE'
      });

      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        emailService.sendStaffActiveMail(user.email, user._id.toString(), user.cid.toString(), function (err) {
          if (err) {
            log(err);
            res.sendStatus(500);
          } else {
            res.sendStatus(201);
          }
        });
      });
    },
    validateConcern: function (req, res, next) {
      donlerValidator({
        concern:{
          name: '关注人id',
          value: req.params.userId,
          validators: [donlerValidator.inDatabase('User', '关注者不存在')]
        }
      }, 'complete', function (pass, msg) {
        if(!pass) {
          var msg = donlerValidator.combineMsg(msg);
          return res.status(400).send({msg:msg});
        }
        else {
          next();
        }
      })
    },
    addConcern: function (req, res) {
      var newConcern = {
        user: req.params.userId,
        createTime: new Date()
      }
      if(!req.user.concern) {
        req.user.concern = [newConcern];
      }
      else {
        var index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
        if(index === -1) {
          req.user.concern.push(newConcern);
        }
        else {
          return res.status(200).send({msg:'已关注过'});
        }
      }
      req.user.save(function(err) {
        if(err) {
          log(err);
          return res.status(500).send({msg:'保存出错'});
        }
        else{
          return res.status(200).send({msg:'添加关注成功'});
        }
      });
    },
    getConcern: function (req, res) {
      //暂时只能获取自己的
      return res.status(200).send({concern: req.user.concern});
    },
    deleteConcern: function (req, res) {
      var index = -1;
      if(req.user.concern){
        index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
      }
      console.log(req.user.concern);
      console.log(index);
      if(index>-1) {
        req.user.concern.splice(index,1);
        req.user.save(function (err) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'保存出错'});
          }
          else{
            return res.status(200).send({msg:'取消关注成功'});
          }
        });
      }
      else {
        return res.status(200).send({msg:'取消关注成功'});
      }
    }
};