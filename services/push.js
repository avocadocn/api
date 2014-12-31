'use strict';

var request = require('request');

var protocol = 'http';
var host = '127.0.0.1';
var port = '4000';

var serverAddr = protocol + '://' + host + ':' + port;
var pushApi = '/push';


/**
 * 申请推送
 * example:
 *  push({
 *    name: 'companyCampaign', // 申请推送服务项目名称，可以是'companyCampaign','teamCampaign','users'
 *    target: {
 *      cid: [company.id], // 是公司活动时需要提供此属性
 *      // tid: [tid1, tid2] 小队活动需要提供此属性
 *      // uid: [uid1, uid2] 推送给个人需要提供此属性
 *    },
 *    msg: {
 *      body: '',
 *      title: '',
 *      description: ''
 *    }
 *  }, function (err) {
 *    if (err) {
 *      // failed
 *    } else {
 *      // success
 *    }
 *  });
 *
 * @param {Object} pushData 推送项目描述
 * @param {Function} callback 推送回应，形式为function (err) {}
 */
var push = function (pushData, callback) {

  request.post(serverAddr + pushApi, {
    body: pushData,
    json: true,
    jsonReviver: true
  }, function (err, res, body) {
    // todo
    if (err) {
      callback(err);
    } else {
      if (body.success === true) {
        callback();
      } else {
        callback('failed');
      }
    }
  });

};

exports.push = push;