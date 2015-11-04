'use strict';

var request = require('request');

var protocol = 'http';
var host = '127.0.0.1';
var port = '4000';

var serverAddr = protocol + '://' + host + ':' + port;
var pushApi = '/push';


/**
 * 申请推送
 * @param {Object} pushData 推送项目描述
 * {
 *   userId: string,
 *   msg: {
 *     body: '',
 *     title: '',
 *     description: ''
 *   }
 * }
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