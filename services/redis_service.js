'use strict';

var mongoose = require('mongoose');
var Q = require('q');
var redis = require('redis');
var redisClient = redis.createClient();
var errorLog = require('./error_log');
var async = require('async');
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
if (process.env.NODE_ENV === 'test') {
  identifier = 'testid:';
}

/**
 * Add new elements to ZSET
 * @param  cid            the id of company
 * @param  type           the type of rank 榜单类型
 * @param  elements       the args of command. eg: 
 * [2, 53e9c3fcd271b3943b2d44c9, 3, 53d798d638cf9def07d1ca23, ... ...]
 * 
 * @return {[type]}      [description]
 */
redisRanking.addEleToZSET = function(cid, type, elements) {
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

  var args = [];
  args.push(hashKey);

  args = args.concat(elements);

  if (!elements.length) {
    deferred.resolve(0);
  } else {
    redisClient.zadd(args, function(err, reply) {
      if (err)
        deferred.reject(err);
      else
        deferred.resolve(reply);
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

  redisClient.zcard(hashKey, function(err, reply) {
    if (err) {
      deferred.reject(err);
      return;
    }

    if (!reply) {
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
/**
 * Update the exist element
 * @param  cid            the id of company
 * @param  type           the type of rank 榜单类型
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

  if (!elements.length) {
    deferred.reject(new Error('参数错误'));
    return deferred.promise;
  }
  var hashKey = identifier + type + cid;
  var args = [];
  args.push(hashKey);
  args = args.concat(elements);
  redisClient.zincrby(args, function(err, reply) {
    if (err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
};
redisRanking.updateGender = function(cid, type, elements) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  if (elements.length<1) {
    deferred.reject(new Error('参数错误'));
    return deferred.promise;
  }
  var hashKey = identifier + type + cid;
  var args = [hashKey,elements[0]]
  async.waterfall([
    function(callback) {
      redisClient.zscore(args, function(err, reply) {
        if (err) callback(err)
        else {
          callback(null, reply)
          redisClient.zrem(args, function(err, reply) {
            if (err) errorLog(err);
          });
        }
      });

    },
    function(score, callback) {
      var newKey = identifier + (type%2+1) + cid;
      var newArgs = [newKey, score, elements[0]]
      redisClient.zadd(newArgs, function(err, reply) {
        if (err)
          callback(err);
        else
          callback(null,reply);
      });
    }
    ],function(err,result) {
      if (err) deferred.reject(err);
      else {
        deferred.resolve(result);
      }
    });
  return deferred.promise;
};
/**
 * removeKey the key
 * @param  cid            the id of company
 * @param  type           the type of rank 榜单类型
 * [2(increment), 53e9c3fcd271b3943b2d44c9]
 * 
 * @return {[type]}         [description]
 */
redisRanking.removeKey = function(cid, type) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }
  var hashKey = identifier + type + cid;
  redisClient.del(hashKey, function(err, reply) {
    if (err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
};

var redisPushQueue = {};

//加入队列
redisPushQueue.addToQueue = function(userId, msg) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }
  redisClient.lpush(userId, function(err, reply) {
    console.log(reply);
    if(err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
};

//若有的话查看第一个元素，没有的话返回null()
redisPushQueue.getFirst = function(userId) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }
  redisClient.lindex([userId, -1], function(err, reply) {
    console.log(reply);
    if(err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
};

//返回整个队列
redisPushQueue.getList = function(userId) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  redisClient.lrange([userId, 0, -1], function(err, reply) {
    console.log(reply);
    if(err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
};

function getListLength(userId) {

  redisClient.llen(userId, function(err, reply) {
    console.log(reply);
    if(err) deferred.reject(err);
    else deferred.resolve(reply);
  });

  return deferred.promise;
}

//删除整个队列
redisPushQueue.deleteList = function(userId) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }
  getListLength(userId)
  .then(function(length) {
    redisClient.ltrim([userId, length, length], function(err, reply) {
      console.log(reply);
      if(err) deferred.reject(err);
      else deferred.resolve(reply);
    })
  })
  .then(null, function(err) {
    deferred.reject(err);
  });

  return deferred.promise;
};

var redisPhoneValidate = {};

/**
 * redis存储验证码,有效期10分钟||expire
 * @param {number} phone 手机号
 * @param {number} code  验证码
 * @param {string} key string:['signup', 'password'] / phone
 * @param {number} expire 有效期(s)
 * reutrn {Promise}  ["OK",1]
 */
redisPhoneValidate.setCode = function(phone, key, code, expire) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }

  var hashKey = key + ':' + phone;
  redisClient.multi([
    ['set', hashKey, code],
    ['expire', hashKey, expire || 600]//设置expire,没有expire默认10分钟
  ]).exec(function(err, replies) {
    if (err) deferred.reject(err);
    else deferred.resolve(replies);
  });
  return deferred.promise;
};

/**
 * 获取redis存储码
 * @param  {number} phone 手机号
 * @param {string} key string:['signup', 'password'] / phone
 * @return {Promise} 保存的验证码 or null
 */
redisPhoneValidate.getCode = function(phone, key) {
  var deferred = Q.defer();

  if (!isConnect) {
    deferred.reject(new Error('redis连接失败'));
    return deferred.promise;
  }
  var hashKey = key + ':' + phone;
  redisClient.get(hashKey, function(err, values) {
    if (err) deferred.reject(err);
    else deferred.resolve(values);
  });
  return deferred.promise;
};



exports.redisRanking = redisRanking;
exports.redisPhoneValidate = redisPhoneValidate;
exports.redisPushQueue = redisPushQueue;