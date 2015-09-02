'use strict';

var http = require('http');
var querystring = require('querystring');
var redisService = require('./redis_service.js');
var mongoose = require('mongoose');
var Config = mongoose.model('Config');
var redisPhoneValidate = redisService.redisPhoneValidate;
/**
 * 使用云片网发短信接口
 * @param  {number/string}   phone    手机号
 * @param {string} key enum:['signup', 'password']
 * @param  {Function} callback 形如function(err){}
 */
exports.sendSMS = function(phone, key, callback) {
  var code = Math.floor(Math.random()*10000);
  if(code<1000) code = code + 1000;
  var data = {
    apikey:'3aad4cd70fb6846ed93d755ae7697af5',
    mobile: phone,
    text: '【warm验证】您的验证码是'+ code +'。如非本人操作，请忽略本短信'
  };
  data = querystring.stringify(data);
  redisPhoneValidate.setCode(phone, key, code)
  .then(function(result) {
    var opt = {
      method: "POST",
      host: "yunpian.com",
      port: "80",
      path: "/v1/sms/send.json",
      headers: {
        "Accept": "text/plain",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": data.length,
        "charset": "utf-8"
      }
    };
    // console.log(code);
    var req = http.request(opt, function (serverFeedback) {
      if (serverFeedback.statusCode == 200) {
        var body = "";
        serverFeedback.on('data', function (data) { body += data; })
                      .on('end', function () {
                        callback()
                      })
      }
      else {
        callback(serverFeedback.statusCode)
      }
    });
    req.write(data + "\n");
    req.end();
  })
  .then(null, function(err) {
    callback(err);
  });
};


var expire = 60*60*24;
var host = '';
function getConfig() {
  Config.findOne({name: 'admin'}, function(err, config) {
    if(err) log(err);
    else {
      host = config.host.product;
    }
  });
}
getConfig();
/**
 * 发送邀请短信(一个用户一天内对同一用户只能发一次)
 * @param  {User}     inviter 
 * @param  {string}   phone 
 * @param  {string}   shortUrl
 * @param  {Function} callback 
 */
exports.sendInviteSMS = function(inviter, phone, shortUrl, callback) {

  redisPhoneValidate.getCode(phone, inviter.phone)
  .then(function (result) {
    //一天内已发过
    if(result) {
      return callback();
    }
    redisPhoneValidate.setCode(phone, inviter.phone, 1, expire)
    var url = 'http://' + host + '/s/' + shortid;
    var data = {
      apikey:'3aad4cd70fb6846ed93d755ae7697af5',
      mobile: phone,
      text: '【warm我们】warm快速注册链接'+ shortUrl + '。来自' + inviter.realname + '。'
    };
    data = querystring.stringify(data);
    var opt = {
      method: "POST",
      host: "yunpian.com",
      port: "80",
      path: "/v1/sms/send.json",
      headers: {
        "Accept": "text/plain",
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": data.length,
        "charset": "utf-8"
      }
    };

    var req = http.request(opt, function (serverFeedback) {
      if (serverFeedback.statusCode == 200) {
        var body = "";
        serverFeedback.on('data', function (data) { body += data; })
                      .on('end', function () {
                        callback()
                      })
      }
      else {
        callback(serverFeedback.statusCode)
      }
    });
    req.write(data + "\n");
    req.end();
  })
  .then(null, function(err) {
    callback(err);
  })
};
