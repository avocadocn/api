'use strict';

var mailer = require('nodemailer'),
  encrypt = require('../encrypt'),
  jade = require('jade'),
  path = require('path'),
  fs = require('fs');

var emailTemplatePath = path.join(__dirname, 'mail_template.jade');

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

var secret = '18801912891';

exports.sendStaffResetPwdMail = function (email, uid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = '动梨密码重置';
  var content = '<p>我们收到您在动梨的密码重置申请信息，请点击下面的链接来重置密码（30分钟内有效）：</p>' +
    '<a style="text-decoration: none; word-break: break-all;" href="http://' + host + '/users/resetPwd?key=' + encrypt.encrypt(uid, secret) +
    '&uid=' + uid + '&time=' + encrypt.encrypt(new Date().toString(), secret) +
    '">重置密码</a>';

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({'title': '重置密码', 'host': siteProtocol + host, 'who': email, 'content': content});
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
  var content = '<p>我们收到您在动梨的密码重置申请信息，请点击下面的链接来重置密码（30分钟内有效）：</p>' +
    '<a style="text-decoration: none; word-break: break-all;" href="http://' + host + '/company/resetPwd?key=' + encrypt.encrypt(uid, secret) +
    '&uid=' + uid + '&time=' + encrypt.encrypt(new Date().toString(), secret) +
    '">重置密码</a>';
  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({'title': '重置密码', 'host': siteProtocol + host, 'who': email, 'content': content});
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
  var content = '<p>我们收到您在动梨的申请信息，请点击下面的链接来激活帐户：</p>' +
    '<a style="text-decoration: none; word-break: break-all;" href="http://' + host + '/users/setProfile?key=' + encrypt.encrypt(uid, secret) +
    '&uid=' + uid + '&cid=' + cid + '">激活账号</a>';

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({'title': '注册激活', 'host': siteProtocol + host, 'who': email, 'content': content});
    transport.sendMail({
      from: from,
      to: to,
      subject: subject,
      html: html
    }, callback);
  });
};

// 现在不需要，该邮件在后台发
exports.sendCompanyActiveMail = function (email, cid, host, callback) {
  var from = '动梨<service@donler.com>';
  var to = email;
  var subject = email + ' 动梨账号激活';
  var content = '<p>我们收到您在动梨的申请信息，请点击下面的链接来激活帐户：</p>' +
    '<a style="text-decoration: none; word-break: break-all;" href="http://' + host + '/company/validate?key=' + encrypt.encrypt(cid, secret) + '&id=' + cid + '">激活账号</a>';

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({'title': '注册激活', 'host': siteProtocol + host, 'who': email, 'content': content});
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
  var content = '<p>我们收到您在动梨的申请信息，请点击下面的链接来激活帐户：</p>' +
    '<a style="text-decoration: none; word-break: break-all;" href="http://' + host + '/users/mailActive?key=' + encrypt.encrypt(uid, secret) +
    '&uid=' + uid + '&cid=' + cid + '">激活账号</a>';

  fs.readFile(emailTemplatePath, 'utf8', function (err, data) {
    if (err) throw err;
    var fn = jade.compile(data);
    var html = fn({'title': '注册激活', 'host': siteProtocol + host, 'who': email, 'content': content});
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