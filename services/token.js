'use strict';

var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');

var headersKeys = ['x-app-id', 'x-api-key', 'x-device-id', 'x-device-type', 'x-platform', 'x-version'];
var modelKeys = ['app_id', 'api_key', 'device_id', 'device_type', 'platform', 'version'];

/**
 * 验证headers是否和user的tokenDevice一致
 * @param  {Object} headers     req.headers
 * @param  {Object} tokenDevice req.user.token_device
 * @return {Boolean}             如果一致，返回true，否则返回false
 */
var validateHeaders = function (headers, tokenDevice) {
  for (var i = 0; i < headersKeys.length; i++) {
    var headersKey = headersKeys[i];
    var modelKey = modelKeys[i];
    if (headers[headersKey] != tokenDevice[modelKey]) {
      return false;
    }
  }
  return true;
};

/**
 * 创建tokenDevice对象以便保存或更新
 * @param  {Object} headers req.headers
 * @return {Object}         see user.token_device
 */
exports.createTokenDevice = function (headers) {
  var tokenDevice = {};
  for (var i = 0; i < headersKeys.length; i++) {
    var headersKey = headersKeys[i];
    var modelKey = modelKeys[i];
    if (headers[headersKey]) {
      tokenDevice[modelKey] = headers[headersKey];
    } else {
      tokenDevice[modelKey] = null;
    }
  }
  return tokenDevice;
};

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
        if (user.app_token !== req.headers['x-access-token'] || !validateHeaders(req.headers, user.token_device)) {
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
};
