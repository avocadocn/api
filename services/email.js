'use strict';

var mongoose = require('mongoose');
var Config = mongoose.model('Config');
var log = require('./error_log.js');

var serviceWebpower = require('./email_services/webpower.js');
var service163 = require('./email_services/163.js');
var serviceSendcloud = require('./email_services/sendcloud.js');

/**
 * 可以是'webpower','163', 'sendcloud'; 默认设为'webpower'
 * @type {string}
 */
var smtp = 'webpower';

/**
 * 从数据库中获取配置，决定使用哪个邮件服务
 * @param {Function} callback 形式为function(err, config)
 */
var getConfig = function (callback) {
  Config.findOne({
    name: 'admin'
  }).exec()
    .then(function (config) {
      if (!config) {
        callback(new Error('not found config'));
        return;
      }
      callback(null, config);
    })
    .then(null, function (err) {
      callback(err);
    });
};

var getService = function (config) {
  switch (config.smtp) {
  case 'webpower':
    return serviceWebpower;
  case '163':
    return service163;
  case 'sendcloud':
    return serviceSendcloud;
  default :
    return null;
  }
};

var emailService = {};

/**
 * 发送员工重置密码邮件
 * @param {String} email 用户email
 * @param {String} uid 用户id
 * @param {Function} callback 形式为function(err)
 */
emailService.sendStaffResetPwdMail = function (email, uid, callback) {
  getConfig(function (err, config) {
    if (err) {
      return callback(err);
    }
    getService(config).sendStaffResetPwdMail(email, uid, config.host.product, callback);
  });
};

/**
 * 发送公司重置密码邮件
 * @param {String} email 公司email
 * @param {String} cid 公司id
 * @param {Function} callback 形式为function(err)
 */
emailService.sendCompanyResetPwdMail = function (email, cid, callback) {
  getConfig(function (err, config) {
    if (err) {
      return callback(err);
    }
    getService(config).sendCompanyResetPwdMail(email, cid, config.host.product, callback);
  });
};

/**
 * 发送员工激活邮件（通过公司邀请链接注册时）
 * @param {String} email 用户邮箱
 * @param {String} uid 用户id
 * @param {String} cid 公司id
 * @param {Function} callback 形式为function(err)
 */
emailService.sendStaffActiveMail = function (email, uid, cid, callback) {
  getConfig(function (err, config) {
    if (err) {
      return callback(err);
    }
    getService(config).sendStaffActiveMail(email, uid, cid, config.host.product, callback);
  });
};

/**
 * 发送员工激活邮件（直接注册时）
 * @param {String} email 用户邮箱
 * @param {String} uid 用户id
 * @param {String} cid 公司id
 * @param {Function} callback 形式为function(err)
 */
emailService.sendNewStaffActiveMail = function (email, uid, cid, callback) {
  getConfig(function (err, config) {
    if (err) {
      return callback(err);
    }
    getService(config).sendNewStaffActiveMail(email, uid, cid, config.host.product, callback);
  });
};

/**
 * 发送员工激活邮件（被邀请时）
 * @param {String} email 用户邮箱
 * @param {String} uid 用户id
 * @param {String} cid 公司id
 * @param {String} cname 公司全称
 * @param {Function} callback 形式为function(err)
 */
emailService.sendInvitedStaffActiveMail = function (email, uid, cid, cname, callback) {
  getConfig(function (err, config) {
    if (err) {
      return callback(err);
    }
    getService(config).sendInvitedStaffActiveMail(email, uid, cid, cname, config.host.product, callback);
  });
};

/**
 * 发送反馈邮件
 * @param {String} email 用户邮箱
 * @param {String} content 内容
 * @param {Function} callback 形式为function(err)
 */
emailService.sendFeedBackMail = function (email, content, callback) {
  getConfig(function (err, config) {
    if (err) {
      return callback(err);
    }
    getService(config).sendFeedBackMail(email, content, callback);
  });
};

module.exports = emailService;

