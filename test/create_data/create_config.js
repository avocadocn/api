'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var Config = mongoose.model('Config');

/**
 * 创建配置数据
 * @param {Function} callback function(err, config){}
 */
var createConfig = function (callback) {
  var config = new Config({
    company_register_need_invite: false,
    host: {
      product: 'www.55yali.com'
    },
    name: 'admin',
    push: {
      apn: {
        push: {
          gateway: 'gateway.sandbox.push.apple.com',
          port: '2195'
        },
        feedback: {
          gateway: 'feedback.sandbox.push.apple.com',
          port: '2196',
          interval: 60
        },
        cert_path: 'dev/PushChatCert.pem',
        key_path: 'dev/PushChatKey.pem',
        passphrase: '55yali'
      },
      baidu: {
        single: true
      },
      status: 'on'
    },
    smtp: 'sendcloud'
  });
  config.save(function (err) {
    if (err) {
      callback(err);
    } else {
      callback(null, config);
    }
  });
};

module.exports = createConfig;