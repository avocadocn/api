'use strict';

var mailer = require('nodemailer'),
  encrypt = require('../encrypt'),
  jade = require('jade'),
  path = require('path'),
  fs = require('fs'),
  config = require('../../config/config.js');

var emailTemplatePath = path.join(__dirname, 'mail_template.jade');
var hrGuidEmailTemplatePath = path.join(__dirname, 'mail_template_company_guide.jade');
var mailOption = {
  host: 'smtp.ym.163.com',
  // secureConnection: true, // use SSL
  // port: 994 ,// port for secure SMTP  默认端口号:25  SSL端口号:994
  auth: {
    user: 'service@donler.com',
    pass: '55yali'
  }
};

var transport = mailer.createTransport('SMTP', mailOption);

var siteProtocol = 'http://';

var secret = config.SECRET;

exports.sendStaffResetPwdMail = function (email, uid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = '动梨密码重置';
  var description = '我们收到您在动梨的密码重置申请信息，请点击下面的链接来重置密码（30分钟内有效）：';
  var link = 'http://' + host + '/users/resetPwd?key=' + encrypt.encrypt(uid, secret)
    + '&uid=' + uid + '&time=' + encrypt.encrypt(new Date().toString(), secret);
  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({
      'title': '重置密码',
      'host': siteProtocol + host,
      'who': email,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

exports.sendCompanyResetPwdMail = function (email, uid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = '动梨密码重置';
  var description = '我们收到您在动梨的密码重置申请信息，请点击下面的链接来重置密码（30分钟内有效）：';
  var link = 'http://' + host + '/company/resetPwd?key=' + encrypt.encrypt(uid, secret) +
    '&uid=' + uid + '&time=' + encrypt.encrypt(new Date().toString(), secret);
  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({
      'title': '重置密码',
      'host': siteProtocol + host,
      'who': email,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

exports.sendStaffActiveMail = function (email, uid, cid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = '动梨账号激活';
  var description = '我们收到您在动梨的申请信息，请点击下面的链接来激活帐户：';
  var link = 'http://' + host + '/users/setProfile?key=' + encrypt.encrypt(uid, secret) +
    '&uid=' + uid + '&cid=' + cid;

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({
      'title': '注册激活',
      'host': siteProtocol + host,
      'who': email,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

// 现在不需要，该邮件在后台发
// todo 因为现在不需要，2015-01-07做了改动，未能测试。如果需要调用此方法，需要先测试。
exports.sendCompanyActiveMail = function (email, cid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = email + ' 动梨账号激活';
  var description = '我们收到您在动梨的申请信息，请点击下面的链接来激活帐户：';
  var link = 'http://' + host + '/company/validate?key=' + encrypt.encrypt(cid, secret) + '&id=' + cid;

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({
      'title': '注册激活',
      'host': siteProtocol + host,
      'who': email,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

exports.sendNewStaffActiveMail = function (email, uid, cid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = '动梨账号激活';
  var description = '我们收到您在动梨的申请信息，请点击下面的链接来激活帐户：';
  var link = 'http://' + host + '/users/mailActive?key=' + encrypt.encrypt(uid, secret) + '&uid=' + uid + '&cid=' + cid;

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({
      'title': '注册激活',
      'host': siteProtocol + host,
      'who': email,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

exports.sendInvitedStaffActiveMail = function (email, host, data, callback) {
  var inviteKey = data.inviteKey;
  var uid = data.uid;
  var cid = data.cid;
  var cname = data.cname;

  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = '动梨账号激活';
  var description = '您的公司' + cname + '已经在动梨上建立了自己的社区，以后您和同事们的活动就可以在动梨上发布、报名、分享，快来点击注册，加入您的小伙伴们吧！请点击下面的链接来激活帐户：';
  var link = 'http://' + host + '/users/invite?key=' + inviteKey + '&uid=' + uid + '&cid=' + cid;

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({
      'title': '注册激活',
      'host': siteProtocol + host,
      'who': email,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

exports.sendFeedBackMail = function (email, content, callback) {
  var from = '动梨<service@donler.com>';
  var to = 'service@donler.com';
  var subject = '动梨用户反馈';
  var content = '<p>' + content + '</p>' + '<p>来自--' + email + '</p>';
  transport.sendMail({
    from: from,
    to: to,
    subject: subject,
    html: content
  }, callback);
};

/**
 * 快速注册邮箱验证
 * @param  {[type]} who  接收人的邮件地址
 * @param  {[type]} name 接收人的公司名
 * @param  {[type]} id   HR的公司id
 * @param  {[type]} host 当前host
 * @return {[type]}      
 */
exports.sendQuickRegisterActiveMail = function(who, name, id, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = who;
  var subject = name + '快速注册激活';
  var description = '我们收到您在动梨的注册申请信息，请点击下面的链接来激活帐户：';
  var link = 'http://' + host + '/company/quickvalidate?key=' + encrypt.encrypt(id,secret) + '&id=' + id;
  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) {throw err;}
    var fn = jade.compile(data);
    var html = fn({
      'title': '快速注册激活',
      'host': siteProtocol + host,
      'who': who,
      'description': description,
      'link': link
    });
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};
/**
 * 公司操作指南
 * @param {String} who 接收人的邮件地址
 * @param  {[type]} name 接收人的公司名
 * @param  {[type]} host 当前host
 * @param  {Function} callback 回调函数
 */
exports.sendCompanyOperationGuideMail = function(who, name, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = who;
  var subject = '公司操作指南';
  fs.readFile(hrGuidEmailTemplatePath, 'utf8', function (err, data) {
     if (err) {throw err;}
    var fn = jade.compile(data);
    var html = fn({
      'title': '公司操作指南',
      'host': siteProtocol + host,
      'who': who,
      'name': name
    });
    transport.sendMail({
      from: from,

      to: to,
      subject: subject,
      html: html
    },callback);
  });
};