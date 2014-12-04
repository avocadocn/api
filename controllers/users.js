'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var donlerValidator = require('../services/donler_validator.js');
var emailService = require('../services/email.js');
var tools = require('../tools/tools.js');

module.exports = function (app) {

  return {

    getUserById: function (req, res) {
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }
          res.send(user);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    login: function (req, res) {
      if (!req.body || !req.body.email || !req.body.password) {
        return res.status(400).send({ msg: '缺少邮箱或密码' });
      }

      User.findOne({
        email: req.body.email
      }).exec()
        .then(function (user) {
          if (!user) {
            return res.status(401).send({ msg: '邮箱或密码错误' });
          }

          if (!user.encryptPassword(req.body.password)) {
            return res.status(401).send({ msg: '邮箱或密码错误' });
          }

          var token = jwt.sign({
            type: "user",
            id: user._id.toString(),
            exp: app.get('tokenExpires')
          }, app.get('tokenSecret'));

          user.app_token = token;
          user.token_device = tokenService.createTokenDevice(req.headers);
          user.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.status(200).send({
                token: token
              });
            }
          });

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    logout: function (req, res) {
      req.user.app_token = null;
      req.user.token_device = null;
      req.user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(204);
        }
      });
    },

    getCompanyByCid: function (req, res, next) {
      if (!req.body || !req.body.cid || req.body.cid === '') {
        res.status(400).send({ msg: 'cid不能为空' });
        return;
      }

      Company.findById(req.body.cid).exec()
        .then(function (company) {
          if (!company) {
            res.status(400).send({ msg: '没有找到对应的公司' });
          } else {
            req.company = company;
            next();
          }
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

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

      var validateDepartment = function (name, value, callback) {
        var departments = req.company.department;
        for (var i = 0; i < value.length; i++) {
          var index = tools.arrayObjectIndexOf(departments, value[i], 'name');
          if (index === -1) {
            callback(false, '公司没有开设该部门');
            return;
          } else {
            departments = departments[index].department;
          }
        }
        callback(true);
      };

      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required']
        },
        email: {
          name: '企业邮箱',
          value: req.body.email + '@' + req.body.domain,
          validators: ['required', 'email', isUsedEmail]
        },
        domain: {
          name: '邮箱后缀',
          value: req.body.domain,
          validators: [validateDomain]
        },
        nickname: {
          name: '昵称',
          value: req.body.nickname,
          validators: ['required']
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(20)]
        },
        realname: {
          name: '真实姓名',
          value: req.body.realname,
          validators: ['required']
        },
        department: {
          name: '部门',
          value: req.body.department,
          validators: ['required', validateDepartment]
        },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number', donlerValidator.isLength(11)]
        }
      }, 'complete', function (pass, msg) {
        if (!pass) {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
          return;
        }
        next();
      });
    },

    register: function (req, res) {
      var email = req.body.email + '@' + req.body.domain;
      var user = new User({
        email: email,
        username: email,
        cid: req.company._id,
        cname: req.company.info.name,
        nickname: req.body.nickname,
        password: req.body.password,
        realname: req.body.realname,
        phone: req.body.phone,
        role: 'EMPLOYEE',
        invite_active: false
      });

      var inviteKeyValid = false;
      if (req.body.inviteKey && req.company.invite_key === req.body.inviteKey) {
        inviteKeyValid = true;
        user.invite_active = true;
      }

      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }

        var emailSender;
        if (inviteKeyValid) {
          emailSender = emailService.sendStaffActiveMail;
        } else {
          emailSender = emailService.sendNewStaffActiveMail;
        }
        emailSender(user.email, user._id.toString(), user.cid.toString(), function (err) {
          if (err) {
            log(err);
            res.sendStatus(500);
          } else {
            res.sendStatus(201);
          }
        });
      });

    }

  }

};
