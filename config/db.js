'use strict';

var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');

var config = require(path.join(__dirname, 'config.js'));
mongoose.connect(config.db);

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

module.exports = mongoose;