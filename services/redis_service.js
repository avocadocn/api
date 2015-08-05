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

  if (!elements.length || elements.length % 2) {
    deferred.reject(new Error('参数错误'));
    return deferred.promise;
  }

  var hashKey = identifier + type + cid;
  var hashKeyInf = identifierInf + type + cid;

  var args = [];
  args.push(hashKey);

  args = args.concat(elements);

  if (limit) {
    redisClient.zadd(args, function(err, reply) {
      if (err) { deferred.reject(err); return; }

      var length = elements.length / 2;

      var commands = [
        ['hincrby', hashKeyInf, 'count', reply],
        ['hmset', hashKeyInf, 'vote', elements[elements.length - 2], 'id', elements[elements.length - 1]]
      ];

      if (length < limit) {
        commands.push(['hmset', hashKeyInf, 'isAll', 1]);
      }

      redisClient.multi(commands).exec(function(err, replies) {
        if (err) deferred.reject(err);
        else deferred.resolve(replies);
      });

    });
  } else {
    redisClient.hmget([hashKeyInf, 'vote', 'id'], function(err, reply) {
      if (err) { deferred.reject(err); return; }

      if ((reply[0] && reply[1]) && (reply[1] < elements[0] || reply[1] == elements[0] && reply[0] > elements[1])) {
        redisClient.zadd(args, function(err, reply) {
          if (err) { deferred.reject(err); return; }
          redisClient.hincrby([hashKeyInf, 'count', reply], function(err, reply) {
            if (err) deferred.reject(err);
            else deferred.resolve(replies);
          });
        });
      }
    });
  }

  return deferred.promise;
};
/**
 * Update the exist element
 * @param  cid            the id of company
 * @param  elements       the args of command. eg: 
 * [2(increment), 53e9c3fcd271b3943b2d44c9]
 * 
 * @return {[type]}         [description]
 */
redisRanking.updateElement = function(cid, type, elements) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  if (!elements.length || elements.length % 2) {
    deferred.reject(new Error('参数错误'));
    return deferred.promise;
  }

  var hashKeyInf = identifierInf + type + cid;

  var args = [];
  args.push(hashKeyInf);

  args = args.concat(elements);

  redisClient.hmset(args, function(err, reply) {
    if (err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
};
/**
 * Remove an element from ZSET
 * @param  cid            the id of company
 * @param  elements       the args of command. eg: 
 * [53e9c3fcd271b3943b2d44c9]
 * @return {[type]}         [description]
 */
// redisRanking.rmEleFromZSET = function(cid, elements) {
//   var deferred = Q.defer();

//   if (!isConnect) {
//     deferred.reject(new Error('redis连接失败'));
//     return deferred.promise;
//   }

//   if (!(elements.length % 2)) {
//     deferred.reject(new Error('参数错误'));
//     return deferred.promise;
//   }

//   var hashKey = identifier + cid;
//   console.log(hashKey);
//   var args = [];
//   args.push(hashKey);

//   args = args.concat(elements);

//   console.log(args);

//   redisClient.zrem(args, function(err, reply) {
//     if (err) deferred.reject(err);
//     else deferred.resolve(reply);
//   });

//   return deferred.promise;
// };

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

  redisClient.hmget([hashKeyInf, 'count', 'isAll'], function(err, reply) {
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
