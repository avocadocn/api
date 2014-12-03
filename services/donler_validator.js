'use strict';

var util = require('util');
var validatorModule = require('validator');
var async = require('async');

// 常用的验证方法可添加到此对象中，特殊的（如验证公司邮箱是否已被使用）请不要添加
var validators = {};

/**
 * 验证参数是否合法
 * 示例:
 *  donlerValidator({
 *    cid: {
 *      name: '公司id',
 *      value: req.body.cid,
 *      validators: ['required']
 *    },
 *    email: {
 *      name: '公司邮箱',
 *      value: req.body.email,
 *      validators: ['required', 'email']
 *    },
 *    asyncTest: {
 *      name: '公司名称',
 *      value: req.body.name,
 *      validators: ['required', function (name, value, callback) {
 *        // do something
 *        callback(false, '该名称已被注册');
 *      }]
 *    }
 *  }, 'complete', function (pass, msg) {
 *    if (pass) {
 *      // 验证通过
 *    } else {
 *      // 验证不通过
 *      console.log(msg.cid) // 公司id不能为空
 *      console.log(msg.email) // 公司邮箱不是一个正确的邮箱地址
 *      console.log(msg.asyncTest) // 该名称已被注册
 *    }
 *  });
 * @param {Object} ruleObj 规则描述
 * @param {String} mode 验证模式，可以是'fast','complete'。fast模式下，只要有一个验证失败，就立即结束；complete模式则会全部验证完才结束。
 * @param {Function} callback 验证完成后的回调函数，形式为function(pass, msg)
 */
module.exports = function (ruleObj, mode, callback) {

  var resultMsg = {};
  var validateTasks = [];

  // 生成验证任务
  for (var ruleName in ruleObj) {
    var rule = ruleObj[ruleName];

    for (var i = 0; i < rule.validators.length; i++) {
      var validatorName = rule.validators[i];
      var validator;
      if (typeof validatorName === 'string') {
        validator = validators[validatorName];
      } else if (typeof validatorName === 'function') {
        validator = validatorName;
      }
      validateTasks.push({
        rule: rule,
        ruleName: ruleName,
        validator: validator
      });
    }
  }

  // 处理单个个验证任务
  var validate = function (validateTask, asyncMapCallback) {
    var name = validateTask.rule.name;
    var value = validateTask.rule.value;
    var ruleName = validateTask.ruleName;
    validateTask.validator(name, value, function (pass, msg) {
      if (mode === 'fast') {
        if (!pass) {
          resultMsg[ruleName] = msg;
          asyncMapCallback(msg, false);
          return;
        } else {
          asyncMapCallback(null, true);
          return;
        }
      } else if (mode === 'complete') {
        if (!pass) {
          resultMsg[ruleName] = msg;
          asyncMapCallback(null, false);
          return;
        } else {
          asyncMapCallback(null, true);
          return;
        }
      }
    });
  };

  // 处理验证任务
  async.map(validateTasks, validate, function (err, results) {
    var pass = true;
    for (var i = 0; i < results.length; i++) {
      if (results[i] === false) {
        pass = false;
        break;
      }
    }
    if (pass === true) {
      callback(true, null);
    } else {
      callback(false, resultMsg);
    }
  });

};

validators.required = function (name, value, callback) {
  if (!value) {
    var msg = util.format('%s不能为空', name);
    callback(false, msg);
  } else {
    callback(true);
  }
};

validators.email = function (name, value, callback) {
  if (!validatorModule.isEmail(value)) {
    var msg = util.format('%s不是一个正确的邮箱地址', name);
    callback(false, msg);
  } else {
    callback(true);
  }
};
