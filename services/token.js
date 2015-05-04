'use strict';

var errorLog = require('./error_log');

var jwt = require('jsonwebtoken');
var mongoose = require('mongoose');
var Q = require('q');
var redis = require('redis');
var redisClient = redis.createClient();

var redisToken = {};

var config = require('../config/config');

var isConnect = false;
redisClient.on("error", function (err) {
  isConnect = false;
  errorLog("[redis]" + err);
});
redisClient.on("ready", function () {
  isConnect = true;
});

var headersKeys = ['x-app-id', 'x-api-key', 'x-device-id', 'x-device-type', 'x-platform', 'x-version'];
var modelKeys = ['app_id', 'api_key', 'device_id', 'device_type', 'platform', 'version'];

/**
 * 验证headers是否和user的device中的一个平台的一致
 * @param  {Object} headers     req.headers
 * @param  {Array} device req.user.device
 * @return {Boolean}             如果一致，返回true，否则返回false
 */
var validateHeaders = function (headers, device) {
  for(var i=0; i<device.length; i++) {
    if(headers['x-platform']==device[i]['platform']){
      for (var j = 0; j < headersKeys.length; j++) {
        var headersKey = headersKeys[j];
        var modelKey = modelKeys[j];
        if (headers[headersKey] != device[i][modelKey]) {
          return false;
        }
      }
      return true;
    }
  }

  return false;
};

exports.verifying = function(req, res, next) {
  var token = req.headers['x-access-token'];
  if (token && token !== 'null') {
    if (isConnect) {
      redisToken.get(token)
        .then(function(replies) {
          var type = replies[0];
          var id = replies[1];
          req.tokenUser = {
            type: type,
            id: id
          };
          next();
        })
        .then(null, next);
    }
    else {
      jwt.verify(token, config.token.secret, function (err, decoded) {
        if (err) {
          console.log(err);
          next();
        }
        else {
          if (decoded.exp > Date.now()) {
            req.tokenUser = {
              type: decoded.type,
              id: decoded.id
            };
          }
          next();
        }
      });
    }
  }
  else {
    next();
  }

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
      return res.status(401).send({msg:'您没有登录或者登录超时，请重新登录'});
    }
    model.findById(req.tokenUser.id).exec()
      .then(function (user) {
        if (!user) {
          return res.status(401).send({msg:'您没有登录或者登录超时，请重新登录'});
        }
        if (!validateHeaders(req.headers, user.device)) {
          return res.status(401).send({msg:'您没有登录或者登录超时，请重新登录'});
        }
        req.user = user;
        next();
      })
      .then(null, next);
  } else {
    res.status(401).send({msg:'您没有登录或者登录超时，请重新登录'});
  }
};



// atk: access token
var identifier = 'atk:';
var invalidErrorMsg = '不是一个有效的Json Web Token';

/**
 * 截取json web token的加密部分作为key存到redis数据库
 * @param  {String} jwt JsonWebToken String
 * @param  {Object} payload jsonWebToken存储的数据(不支持多层嵌套的对象)
 * @return {Promise}
 */
redisToken.create = function(jwt, payload) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  var res = jwt.split('.');
  if (!res[2]) {
    deferred.reject(new Error(invalidErrorMsg));
    return deferred.promise;
  }
  var hashKey = identifier + res[2];

  var args = [];
  args.push(hashKey);

  for (var key in payload) {
    if (key !== 'iat') {
      args.push(key);
      args.push(payload[key].toString());
    }
  }

  redisClient.hmset(args, function(err, reply) {
    if (err) deferred.reject(err);
    else setExpire();
  });

  function setExpire() {
    var exp = config.token.expires / 1000; // 单位是秒
    redisClient.expire(hashKey, exp, function(err, reply) {
      if (err) deferred.reject(err);
      else deferred.resolve(reply);
    });
  }
  return deferred.promise;
};

/**
 * 更新token的生存时间
 * @param  {String} jwt
 * @return {Promise}
 */
redisToken.refresh = function(jwt) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  var res = jwt.split('.');
  if (!res[2]) {
    deferred.reject(new Error(invalidErrorMsg));
    return deferred.promise;
  }
  var hashKey = identifier + res[2];

  var exp = config.token.expires / 1000; // 单位是秒
  redisClient.expire(hashKey, exp, function(err, reply) {
    if (err) deferred.reject(err);
    else deferred.resolve(reply);
  });
  return deferred.promise;
};

/**
 * 删除token
 * @param  {String} jwt
 * @return {Promise}
 */
redisToken.delete = function(jwt) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  var res = jwt.split('.');
  if (!res[2]) {
    deferred.reject(new Error(invalidErrorMsg));
    return deferred.promise;
  }
  var hashKey = identifier + res[2];

  redisClient.del(hashKey, function(err, reply) {
    if (err) deferred.reject(err);
    else deferred.resolve(reply);
  });
  return deferred.promise;
};

/**
 * 获取token的数据
 * @param  {String} jwt
 * @return {Promise}
 */
redisToken.get = function(jwt) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  var res = jwt.split('.');
  if (!res[2]) {
    deferred.reject(new Error(invalidErrorMsg));
    return deferred.promise;
  }
  var hashKey = identifier + res[2];

  var args = [hashKey, 'type', 'id'];

  redisClient.hmget(args, function(err, replies) {
    if (err) deferred.reject(err);
    else deferred.resolve(replies);
  });
  return deferred.promise;
};

exports.redisToken = redisToken;
