'use strict';

var fs = require('fs');

/**
 * 读取目录的每个文件，对于子目录递归处理
 * @param {String} path 需要绝对路径以保证爽正确
 * @param {Function} callback 不提供则直接require该路径的文件，如果提供callback，则形式为function(filename, path)，获取每个文件的文件名和路径
 */
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

module.exports = walk;