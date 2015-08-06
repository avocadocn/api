'use strict';

var mongoose = require('mongoose');
var Q = require('q');
var redis = require('redis');
var redisClient = redis.createClient();
var errorLog = require('./error_log');

var isConnect = false;

redisClient.on("error", function (err) {
  isConnect = false;
  errorLog("[redis]" + err);
});

redisClient.on("ready", function () {
  isConnect = true;
});

var redisRanking = {};

var identifier = 'id:';
var identifierInf = 'inf:';

/**
 * Add new elements to ZSET
 * @param  cid            the id of company
 * @param  elements       the args of command. eg: 
 * [2, 53e9c3fcd271b3943b2d44c9, 3, 53d798d638cf9def07d1ca23, ... ...]
 * 
 * @return {[type]}      [description]
 */
redisRanking.addEleToZSET = function(cid, type, elements, limit) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  if (elements.length % 2) {
    deferred.reject(new Error('参数错误'));
    return deferred.promise;
  }

  var hashKey = identifier + type + cid;
  var hashKeyInf = identifierInf + type + cid;

  var args = [];
  args.push(hashKey);

  args = args.concat(elements);

  if (!elements.length) {
    redisClient.hmset([hashKeyInf, 'all', 1], function(err, reply) {
      if (err) deferred.reject(err);
      else deferred.resolve(replies);
    });
  } else {
    redisClient.zadd(args, function(err, reply) {
      if (err) {
        deferred.reject(err);
        return;
      }

      var length = elements.length / 2;

      var commands = [
        ['hincrby', hashKeyInf, 'count', reply]
      ];

      if (length < limit) {
        commands.push(['hmset', hashKeyInf, 'all', 1]);
      }

      redisClient.multi(commands).exec(function(err, replies) {
        if (err) deferred.reject(err);
        else deferred.resolve(replies);
      });

    });
  }
  return deferred.promise;
};

/**
 * Get elements from ZSET
 * @param  cid            the id of company 公司id
 * @param  type           the type of rank 榜单类型
 * @param  elements       the args of command. eg:  命令参数
 * [0, -1]
 * @return {[type]}         [description]
 */
redisRanking.getEleFromZSET = function(cid, type, elements) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  if (!elements.length || elements.length % 2) {
    deferred.reject(new Error('参数错误'));
    return deferred.promise;
  }

  var hashKey = identifier + type + cid;
  var hashKeyInf = identifierInf + type + cid;

  redisClient.hmget([hashKeyInf, 'count', 'all'], function(err, reply) {
    if (err) {
      deferred.reject(err);
      return;
    }

    if (!reply[0] || ((parseInt(reply[0])) <= elements[1] && (!reply[1] || reply[1] === '0'))) {
       deferred.resolve({exist: false});
       return;
    }

    var args = [];
    args.push(hashKey);

    args = args.concat(elements);

    args.push('WITHSCORES');

    redisClient.zrevrange(args, function(err, reply) {
      if (err) deferred.reject(err);
      else deferred.resolve({exist: true, value: reply});
    });
  });

  return deferred.promise;
};

exports.redisRanking = redisRanking;
