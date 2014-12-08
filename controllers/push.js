'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');

var log = require('../services/error_log.js');
var auth = require('../services/auth.js');
module.exports = function (app) {
  return {
    getPushStatus: function(req, res){
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }

          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['getUserCompleteData']);
          if (allow.getUserCompleteData) {
            res.status(200).send(user.push_toggle);
          }
          else{
            res.status(403).send({ msg: "没有权限获取该信息" });
          }

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    updatePushStatus: function(req, res){
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }

          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['changeUserPushStatus']);
          if (allow.changeUserPushStatus) {
            user.push_toggle = !!req.body.pushStatus;
            user.save(function(err){
              res.status(200).send(user.push_toggle);
            });
          }
          else{
            res.status(403).send({ msg: "没有权限获取该信息" });
          }

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    }
  }
}