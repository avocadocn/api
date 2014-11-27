'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');

var jwt = require('jwt-simple');

module.exports = function (app) {

  return {

    getUserById: function (req, res) {
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.send(404, "找不到该用户");
          }
          res.send(user);
        })
        .then(null, function (err) {
          console.log(err);
          res.sendStatus(500);
        });
    },

    login: function (req, res) {
      if (!req.body || !req.body.email || !req.body.password) {
        return res.send(400, '缺少邮箱或密码');
      }

      User.findOne({
        email: req.body.email
      }).exec()
        .then(function (user) {
          if (!user) {
            return res.send(401, '邮箱或密码错误');
          }

          if (!user.encryptPassword(req.body.password)) {
            return res.send(401, '邮箱或密码错误');
          }

          var token = jwt.encode({
            type: "user",
            id: user._id.toString(),
            exp: app.get('tokenExpires')
          }, app.get('tokenSecret'));

          res.send(200, {
            token: token
          });

        })
        .then(null, function (err) {
          // todo temp err handle
          console.log(err);
          res.sendStatus(500);
        })
    }

  }

}