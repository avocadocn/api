'use strict';

var http = require('http');
var querystring = require('querystring');
var redisService = require('./redis_service.js');
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
