'use strict';

var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');

exports.verifying = function (app) {
  return function (req, res, next) {
    var token = req.headers['x-access-token'];
    if (token) {

      jwt.verify(token, app.get('tokenSecret'), function (err, decoded) {
        if (err) {
          console.log(err);
          next();
        } else {
          if (decoded.exp > Date.now()) {
            req.tokenUser = {
              type: decoded.type,
              id: decoded.id
            };
            req.token = token;
          }
          next();
        }
      });
    } else {
      next();
    }

  };
};


// 需要token才能到下一个中间件，根据token附带的用户id和类型，从数据库中获取完整的用户数据
exports.needToken = function (req, res, next) {
  if (req.tokenUser) {
    var model;
    if (req.tokenUser.type === 'user') {
      model = mongoose.model('User');
    } else if (req.tokenUser.type === 'company') {
      model = mongoose.model('Company');
    }
    if (!model) {
      return res.sendStatus(401);
    }
    model.findById(req.tokenUser.id).exec()
      .then(function (user) {
        if (!user) {
          return res.sendStatus(401);
        }
        if (user.app_token !== req.token) {
          return res.sendStatus(401);
        }

        req.user = user;
        next();
      })
      .then(null, function (err) {
        // todo temp err handle
        console.log(err);
        res.sendStatus(500);
      });
  } else {
    res.sendStatus(401);
  }
}