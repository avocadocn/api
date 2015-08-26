var path = require('path');
var multer = require('multer');
var mime = require('mime');
var async = require('async');
var fs = require('fs');
var gm = require('gm');
var log = require('../services/error_log.js');
var mkdirp = require('mkdirp');

var publicDir = path.join(__dirname, '../../yali/public/img/');

/**
 * 上传接口，调用后文件存储于img/dest/20xx-x/xxx
 * @param  {string} dest 目标文件夹
 */
exports.upload = function(dest) {
  var destDir = path.join(publicDir,dest);
  var now = new Date();
  var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
  var childDir = path.join(destDir, dateDirName);
  if (!fs.existsSync(childDir)) {
    mkdirp.sync(childDir);
  }
  var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, childDir)
    },
    filename: function (req, file, cb) {
      var ext = mime.extension(file.mimetype);
      cb(null, Date.now() + '.' +ext)
    }
  })

  var upload = multer({ storage: storage })
  return upload;
}


/**
 * 图片处理
 * @param  {array}   files
 * @param  {object}  options  {
 *                              getSize : boolean
 *                            }
 * @param  {Function} callback(err,files)
 */
exports.formatPhotos = function(files, options, callback) {
  //检查文件及文件类型，过滤掉不要的
  var allowExts = ['jpg','png','gif'];
  for(var i = files.length-1; i>=0; i--) {
    var ext = mime.extension(files[i].mimetype);
    if(allowExts.indexOf(ext) === -1) {
      fs.unlink(files[i].path, function(err) {
        console.log(err);
      });
      files.splice(i, 1);
    }
  }
  if(!files || files.length === 0) {
    return callback();
  }
  //获取size
  if(options.getSize) {
    async.map(files, function(file, mapCallback) {
      try {
        gm(file.path).size(function(err, size) {
          if(err) {
            mapCallback(err);
          } 
          file.size = size;
          mapCallback(null, file);
        });
      }
      catch(e) {
        mapCallback(e);
      }
    },function(err, files) {
      callback(err, files);
    })
  }
  else {
    callback(null,files);
  }

}
