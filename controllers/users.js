'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');

module.exports = function (app) {

  return {

    getUserById: function (req, res) {
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send("找不到该用户");
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
        return res.status(400).send('缺少邮箱或密码');
      }

      User.findOne({
        email: req.body.email
      }).exec()
        .then(function (user) {
          if (!user) {
            return res.status(401).send('邮箱或密码错误');
          }

          if (!user.encryptPassword(req.body.password)) {
            return res.status(401).send('邮箱或密码错误');
          }

          var token = jwt.sign({
            type: "user",
            id: user._id.toString(),
            exp: app.get('tokenExpires')
          }, app.get('tokenSecret'));

          user.access_token = token;
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
      req.user.access_token = null;
      req.user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(204);
        }
      });
    }

  }

}