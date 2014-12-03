'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var donlerValidator = require('../services/donler_validator.js');

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

    register: function (req, res) {
      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required']
        },
        email: {
          name: '企业邮箱',
          value: req.body.email + '@' + req.body.domain,
          validators: ['required', 'email']
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
          validators: ['required']
        },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number', donlerValidator.isLength(11)]
        }
      }, 'complete', function (pass, msg) {
        // todo 测试验证是否成功
        if (pass) {
          res.sendStatus(200);
        } else {
          res.status(400).send(msg);
        }
      });

    }

  }

}