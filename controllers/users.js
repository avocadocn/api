'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var donlerValidator = require('../services/donler_validator.js');
var emailService = require('../services/email.js');
var uploader = require('../services/uploader.js');
var auth = require('../services/auth.js');
var tools = require('../tools/tools.js');

module.exports = function (app) {

  return {

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
        if (!value) {
          callback(true);
          return;
        }
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
          validators: ['required', donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
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
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
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

    },

    getUserById: function (req, res) {
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }

          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['getUserCompleteData', 'getUserBriefData', 'getUserMinData']);
          if (allow.getUserCompleteData) {
            var tids = [];
            user.team.forEach(function (team) {
              tids.push(team._id);
            });

            var completeData = {
              _id: user._id,
              email: user.email,
              nickname: user.nickname,
              photo: user.photo,
              realname: user.realname,
              department: user.department,
              sex: user.sex,
              birthday: user.birthday,
              bloodType: user.bloodType,
              introduce: user.introduce,
              registerDate: user.register_date,
              phone: user.phone,
              qq: user.qq,
              company: {
                _id: user.cid,
                name: user.company_official_name,
                briefName: user.cname
              },
              tids: tids,
              lastCommentTime: user.last_comment_time
            };
            res.status(200).send(completeData);
          } else if (allow.getUserBriefData) {
            var briefData = {
              _id: user._id,
              email: user.email,
              nickname: user.nickname,
              photo: user.photo,
              realname: user.realname,
              department: user.department,
              sex: user.sex,
              birthday: user.birthday,
              bloodType: user.bloodType,
              introduce: user.introduce,
              phone: user.phone,
              qq: user.qq
            };
            res.status(200).send(briefData);
          } else if (allow.getUserMinData) {
            var minData = {
              _id: user._id,
              nickname: user.nickname,
              photo: user.photo
            };
            res.status(200).send(minData);
          } else {
            res.sendStatus(403);
          }

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    updateValidate: function (req, res, next) {
      var role = auth.getRole(req.user, {
        companies: [req.resourceUser.cid],
        users: [req.resourceUser._id]
      });
      var allow = auth.auth(role, ['editUser']);
      if (!allow.editUser) {
        res.sendStatus(403);
        return;
      }
      donlerValidator({
        nickname: {
          name: '昵称',
          value: req.body.nickname,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: [donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        realname: {
          name: '真实姓名',
          value: req.body.realname,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        intro: {
          name: '简介',
          value: req.body.realname,
          validators: [donlerValidator.maxLength(40)]
        },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number', donlerValidator.isLength(11)]
        },
        qq: {
          name: 'qq',
          value: req.body.qq,
          validators: ['number']
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

    updatePhoto: function (req, res, next) {
      uploader(req, {
        fieldName: 'photo',
        targetDir: '/public/img/user/photo',
        success: function (url, oriName) {
          user.photo = path.join('/img/user/photo', url);
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

    update: function (req, res) {
      var user = req.resourceUser;
      if (req.body.nickname) {
        user.nickname = req.body.nickname;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }
      if (req.body.realname) {
        user.realname = req.body.realname;
      }
      if (req.body.intro) {
        user.introduce = req.body.intro;
      }
      if (req.body.phone) {
        user.phone = req.body.phone;
      }
      if (req.body.qq) {
        user.qq = req.body.qq;
      }
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
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
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });

    },

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
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });
    }

  };
};
