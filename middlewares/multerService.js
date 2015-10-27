var path = require('path');
var multer = require('multer');
var mime = require('mime');
var async = require('async');
var fs = require('fs');
var gm = require('gm');
var log = require('../services/error_log.js');
var mkdirp = require('mkdirp');

var publicDir = path.join(__dirname, '../../yali/public/img/');
var oriDir = path.join(__dirname, '../../yali/ori_img/');
var publicKey ='public/img';
var oriKey ='ori_img';
/**
 * 上传接口，调用后文件存储于img/dest/20xx-x/xxx
 * @param  {string} dest 目标文件夹
 */
exports.upload = function(dest) {
  var destDir = path.join(oriDir,dest);
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
exports.formatPhotos = function (files, options, callback) {
  if(!files) {
    return callback();
  }
  //检查文件及文件类型，过滤掉不要的
  var allowExts = ['jpg','png','gif','jpeg'];
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
  try {
    var now = new Date();
    async.map(files, function (file, mapCallback) {
      var thumbPath = file.path.replace(oriKey,publicKey);
      gm(file.path)
        .resize(750)
        .write(thumbPath, function (err) {
          if(err) {
            console.log('Error writing file to disk: ' + err);
          }
          
          // if(!options.saveOrign) {
          //   fs.unlink(file.path,function (err) {
          //     err && console.log(err);
          //   });
          // }
          file.path = thumbPath;
          //获取size
          if(options.getSize) {
            gm(thumbPath).size(function (err, size) {
              if(err) {
                mapCallback(err);
              }
              else {
                file.size = size;
                mapCallback(null, file);
              }
            });
          }
          else {
            mapCallback(null,file);
          }
        });
    },function (err, files) {
      callback(err, files);
    })
  }
  catch(e) {
    callback(e);
  }
}
exports.getRelPath = function (dest) {
  return dest.slice(dest.indexOf('yali/public')+11)
}


