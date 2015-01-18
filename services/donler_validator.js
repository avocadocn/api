'use strict';

var util = require('util');
var validatorModule = require('validator');
var async = require('async');
var moment = require('moment');

var mongoose = require('mongoose');
var Region = mongoose.model('Region');

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
 *      name: 'test',
 *      value: 'test',
 *      validators: ['required', function (name, value, callback) {
 *        // do something
 *        callback(false, '该名称已被注册');
 *      }]
 *    },
 *    name: {
 *      name: '公司名称',
 *      value: req.body.name,
 *      validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(20)]
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
var donlerValidator = function (ruleObj, mode, callback) {

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
    if (!validateTask.validator) {
      console.log(ruleName, '存在无效的验证器');
      asyncMapCallback('无效的验证器', false);
      return;
    }
    validateTask.validator(name, value, function (pass, msg) {
      if (mode === 'fast') {
        if (!pass) {
          if (!validateTask.rule.hideMsg) {
            resultMsg[ruleName] = msg;
          }
          // 这个msg只是为了中断验证，没有其它用处
          asyncMapCallback(msg, false);
          return;
        } else {
          asyncMapCallback(null, true);
          return;
        }
      } else if (mode === 'complete') {
        if (!pass) {
          if (!resultMsg[ruleName]) {
            resultMsg[ruleName] = msg;
          } else {
            resultMsg[ruleName] += (';' + msg);
          }
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

donlerValidator.minLength = function (min) {
  return function (name, value, callback) {
    if (!value || value.length >= min) {
      callback(true);
    } else {
      var msg = util.format('%s最小长度为%d', name, min);
      callback(false, msg);
    }
  };
};

donlerValidator.maxLength = function (max) {
  return function (name, value, callback) {
    if (!value || value.length <= max) {
      callback(true);
    } else {
      var msg = util.format('%s最大长度为%d', name, max);
      callback(false, msg);
    }
  };
};

donlerValidator.isLength = function (length) {
  return function (name, value, callback) {
    if (!value || value.length === length) {
      callback(true);
    } else {
      var msg = util.format('%s的长度应为%d', name, length);
      callback(false, msg);
    }
  };
};

donlerValidator.after = function (date) {
  return function (name, value, callback) {
    if (validatorModule.isAfter(value, date)) {
      callback(true);
    } else {
      var formatDate;
      if (date) {
        formatDate = moment(date).format('YYYY年M月D日');
      } else {
        formatDate = '现在';
      }
      var msg = util.format('%s不能早于%s', name, formatDate);
      callback(false, msg);
    }
  };
};

donlerValidator.before = function (date) {
  return function (name, value, callback) {
    if (validatorModule.isBefore(value, date)) {
      callback(true);
    } else {
      var formatDate;
      if (date) {
        formatDate = moment(date).format('YYYY年M月D日');
      } else {
        formatDate = '现在';
      }
      var msg = util.format('%s不能晚于%s', name, formatDate);
      callback(false, msg);
    }
  };
};

donlerValidator.enum = function (enums, customMsg) {
  return function (name, value, callback) {
    if (!value) {
      callback(true);
    } else {
      if (enums.indexOf(value) === -1) {
        var msg;
        if (!customMsg) {
          msg = util.format('%s只能是%s', name, enums);
        } else {
          msg = customMsg;
        }
        callback(false, msg);
      } else {
        callback(true);
      }
    }
  };
};

donlerValidator.combineMsg = function (msg) {
  var resMsg = '';
  for (var i in msg) {
    resMsg += msg[i];
    resMsg += ';';
  }
  resMsg = resMsg.slice(0, resMsg.length - 1);
  return resMsg;
};



validators.required = function (name, value, callback) {
  if (value == undefined) {
    var msg = util.format('%s不能为空', name);
    callback(false, msg);
  } else {
    callback(true);
  }
};

validators.email = function (name, value, callback) {
  if (!value) {
    callback(true);
    return;
  }
  if (!validatorModule.isEmail(value)) {
    var msg = util.format('%s不是一个正确的邮箱地址', name);
    callback(false, msg);
  } else {
    callback(true);
  }
};

validators.number = function (name, value, callback) {
  if (!value) {
    callback(true);
    return;
  }
  if (!validatorModule.isNumeric(value)) {
    var msg = util.format('%s必须是数字', name);
    callback(false, msg);
  } else {
    callback(true);
  }
};

validators.sex = function (name, value, callback) {
  if(!value) {
    callback(true);
    return;
  }
  if( value!='男' && value!='女') {
    var msg = util.format('%s无效', name);
    callback(false, msg);
  }else {
    callback(true);
  }
};

validators.date = function (name, value, callback) {
  if (!value) {
    callback(true);
    return;
  }
  if (!validatorModule.isDate(value)) {
    var msg = util.format('%s不是有效的日期格式', name);
    callback(false, msg);
  } else {
    callback(true);
  }
};

/**
 * 验证省市区是否合法
 * @param {String} name 验证目标的名称，用于描述错误消息
 * @param {String} value 省，市，区，用英文逗号分隔，如"广西,梧州市,长洲区"
 * @param {Function} callback
 */
validators.region = function (name, value, callback) {
  if (!value) {
    callback(true);
    return;
  }
  var regions = value.split(',');
  var province = regions[0], city = regions[1], district = regions[2];
  Region.findOne({
    name: province,
    'city.name': city,
    'city.district.name': district
  }, { '_id': 1 }).exec()
    .then(function (region) {
      if (!region) {
        var msg = util.format('%s是无效的省市区', name);
        callback(false, msg);
      } else {
        callback(true);
      }
    })
    .then(null, function (err) {
      console.log(err);
      var msg = util.format('验证%s时出错了', name);
      callback(false, msg);
    });
};


module.exports = donlerValidator;