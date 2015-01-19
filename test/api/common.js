var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');

var config = require(path.join(__dirname, '../../config/config.js'));
mongoose.createConnection(config.db);

var walk = function(path, callback) {
  fs.readdirSync(path).forEach(function(file) {
    var newPath = path + '/' + file;
    var stat = fs.statSync(newPath);
    if (stat.isFile()) {
      if (/(.*)\.(js$)/.test(file)) {
        if (callback) {
          callback(file, newPath)
        } else {
          require(newPath);
        }
      }
    } else if (stat.isDirectory()) {
      walk(newPath, callback);
    }
  });
};
// 初始化 mongoose models
walk(path.join(config.rootPath, 'models/'));

/**
 * 用于测试断言的数据
 */
var data = {};

/**
 * 是否已经获取到数据
 * @type {boolean}
 */
var gotData = false;

exports.mongoose = mongoose;

/**
 * 从数据库获取数据并保存起来；如果已经获取过了，就不会再去获取
 * @param {Function} callback 形式为function(err)
 */
exports.getDataFromDB = function (callback) {
  if (gotData) {
    callback();
    return;
  }
  mongoose.model('Company')
    .findOne()
    .exec()
    .then(function (company) {
      if (!company) {
        callback('not any company');
      } else {
        data.companies = [company];
        gotData = true;
        callback();
      }
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 获取已经从数据库获取到的数据
 * @returns {Object}
 */
exports.getData = function () {
  return data;
};