'use strict';

var multiparty = require('multiparty');
var gm = require('gm');
var mime = require('mime');
var path = require('path');
var fs = require('fs');
var mkdirp = require('mkdirp');

// 要求api项目与yali项目在同一目录下
var yaliDir = path.join(__dirname, '../../yali/');
var tempDir = path.join(yaliDir, 'temp_uploads');


/**
 * 上传照片到某个目录
 * 示例:
 *  uploadImg(req, {
 *    fieldName: 'photo', // 表单域名称
 *    targetDir: '/photos', // 目标文件夹路径，不能是绝对路径，根目录已设置为yali网站目录，如现在等同于yali/photos；
 *                          // 上传时，会自动在该目录下添加当前月份的子目录，如yali/photos/2014-9/
 *    saveOrigin: true, // 是否保留原图
 *    success: function (url, oriName, oriCallback) {
 *      // url为保存成功后的带日期目录的文件路径，如2014-9/21912323434.jpg
 *      // oriName为上传的源文件的名字
 *      oriCallback(path, name, function (err) {
 *        console.log(err);
 *      }); // path为原图路径，其根目录已设为yali网站目录，不能是绝对路径；name为不含后缀的文件名。
 *    },
 *    error: function (err) {
 *      console.log(err);
 *    }
 *  });
 * @param {Object} req
 * @param {Object} options
 */
exports.uploadImg = function (req, options) {

  var form = new multiparty.Form({
    uploadDir: tempDir
  });

  form.parse(req, function (err, fields, files) {

    if (err) {
      options.error(err);
      return;
    }

    var file = files[options.fieldName];

    if (!file) {
      options.error({
        type: 'notfound',
        msg: '没有收到文件' + options.fieldName
      });
      return;
    }

    try {
      var now = new Date();
      var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
      var ext = mime.extension(file.originalFilename);
      var dateImgName = Date.now().toString() + '.' + ext;

      var imgDir = path.join(yaliDir, options.targetDir, dateDirName);
      if (!fs.existsSync(imgDir)) {
        mkdirp.sync(imgDir);
      }

      gm(file.path).write(path.join(imgDir, dateImgName), function(err) {
        if (err) {
          options.error(err);
          return;
        }

        if (options.saveOrigin) {

          var saveOrigin = function (oriPath, oriName, oriCallback) {
            var oriDir = path.join(yaliDir, oriPath);
            if (!fs.existsSync(oriDir)) {
              mkdirp.sync(oriDir);
            }

            fs.rename(file.path, path.join(yaliDir, oriPath, oriName + ext), function (err) {
              oriCallback(err);
            });
          };

          options.success(path.join(dateDirName, dateImgName), file.originalFilename, saveOrigin);
        } else {
          options.success(path.join(dateDirName, dateImgName), file.originalFilename);
        }
      });
    } catch (e) {
      options.error(e);
    }

  });

};