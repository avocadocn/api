'use strict';

var path = require('path');
var fs = require('fs');

var multiparty = require('multiparty');
var gm = require('gm');
var mime = require('mime');
var mkdirp = require('mkdirp');
var async = require('async');

// 要求api项目与yali项目在同一目录下
var yaliDir = path.join(__dirname, '../../yali/');
var tempDir = path.join(yaliDir, 'temp_uploads');
exports.yaliDir = yaliDir;
exports.tempDir = tempDir;
  
/**
 * 上传照片到某个目录
 * 示例:
 *  uploadImg(req, {
 *    fieldName: 'photo', // (必需)表单域名称
 *    targetDir: '/photos', // (必需)目标文件夹路径，不能是绝对路径，根目录已设置为yali网站目录，如现在等同于yali/photos；
 *                          // 上传时，会自动在该目录下添加当前月份的子目录，如yali/photos/2014-9/
 *    subDir: '123',
 *    saveOrigin: true, // 是否保留原图
 *
 *    // 获取请求中的其它参数
 *    getFields: function (fields) {
 *    },
 *    // (必需)上传成功的回调
 *    success: function (url, oriName, oriCallback) {
 *      // url为保存成功后的带日期目录的文件路径，如2014-9/21912323434.jpg
 *      // 如果有设置subDir,则url为2014-9/123/21912323434.jpg
 *      // oriName为上传的源文件的名字
 *      oriCallback(path, name, function (err) {
 *        console.log(err);
 *      }); // path为原图路径，其根目录已设为yali网站目录，不能是绝对路径；name为不含后缀的文件名。
 *    },
 *    error: function (err) {
 *      console.log(err);
 *    },
 *
 *    //获取图片的尺寸，如果getSize有定义，则会获取到图片的尺寸后才调用success方法
 *    getSize: function (err, size) {
 *      console.log(size.width, size.height);
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

    if (options.getFields) {
      options.getFields(fields);
    }

    if (err) {
      options.error(err);
      return;
    }
    if (!files[options.fieldName]) {
      if (options.error) {
        options.error({
          type: 'notfound',
          msg: '没有收到文件' + options.fieldName
        });
        return;
      }
    }
    var file = files[options.fieldName][0];
    if (!file) {
      if (options.error) {
        options.error({
          type: 'notfound',
          msg: '没有收到文件' + options.fieldName
        });
        return;
      }
    }
    try {
      var now = new Date();
      var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
      if (options.subDir) {
        dateDirName = path.join(dateDirName, options.subDir);
      }
      var ext = mime.extension(file.headers['content-type']);
      var dateImgName = Date.now().toString() + '.' + ext;
      var imgDir = path.join(yaliDir, options.targetDir, dateDirName);
      if (!fs.existsSync(imgDir)) {
        mkdirp.sync(imgDir);
      }
      gm(file.path).write(path.join(imgDir, dateImgName), function(err) {
        if (err) {
          if (options.error) {
            options.error(err);
          }
          return;
        }

        var doSuccess = function () {
          if (options.saveOrigin) {
            var saveOrigin = function (oriPath, oriName, oriCallback) {
              var oriDir = path.join(yaliDir, oriPath);
              if (!fs.existsSync(oriDir)) {
                mkdirp.sync(oriDir);
              }
              fs.rename(file.path, path.join(yaliDir, oriPath, oriName + '.' + ext), function (err) {
                oriCallback(err);
              });
            };
            options.success(path.join(dateDirName, dateImgName), file.originalFilename, saveOrigin);
          } else {
            options.success(path.join(dateDirName, dateImgName), file.originalFilename);
              fs.unlink(file.path, function (err) {
              console.log(err);
            });
          }
        };

        if (options.getSize) {
          async.waterfall([
            function (callback) {
              try {
                gm(file.path).size(function (err, size) {
                  if (err) {
                    if (options.error) {
                      options.error(err);
                    }
                    callback(err);
                  } else {
                    options.getSize(size);
                    callback();
                  }
                });
              } catch (e) {
                if (options.error) {
                  options.error(e);
                }
                callback(e);
              }
            },
            function (callback) {
              doSuccess();
              callback();
            }
          ]);
        } else {
          doSuccess();
        }
          
      });
    } catch (e) {
      if (options.error) {
        options.error(e);
      }
    }

  });

};

/**
 * 上传照片到某个目录
 * @param  {[type]} file    [description]
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
exports.uploadImage = function(file, options) {
  if (!file) {
    if (options.error) {
      options.error({
        type: 'notfound',
        msg: '没有收到文件' + options.fieldName
      });
      return;
    }
  }
  try {
    var now = new Date();
    var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
    if (options.subDir) {
      dateDirName = path.join(dateDirName, options.subDir);
    }
    var ext = mime.extension(file.headers['content-type']);
    var dateImgName = Date.now().toString() + '.' + ext;
    var imgDir = path.join(yaliDir, options.targetDir, dateDirName);
    if (!fs.existsSync(imgDir)) {
      mkdirp.sync(imgDir);
    }
    gm(file.path).write(path.join(imgDir, dateImgName), function(err) {
      if (err) {
        if (options.error) {
          options.error(err);
        }
        return;
      }

      var doSuccess = function(size) {
        var imgInfo = {};
        imgInfo.url = path.join(dateDirName, dateImgName);
        imgInfo.originName = file.originalFilename;
        imgInfo.size = size;

        if (options.saveOrigin) {
          var saveOrigin = function(oriPath, oriName, oriCallback) {
            var oriDir = path.join(yaliDir, oriPath);
            if (!fs.existsSync(oriDir)) {
              mkdirp.sync(oriDir);
            }
            fs.rename(file.path, path.join(yaliDir, oriPath, oriName + '.' + ext), function(err) {
              oriCallback(err);
            });
          };

          options.success(imgInfo, saveOrigin);
        } else {
          options.success(imgInfo);
          fs.unlink(file.path, function(err) {
            console.log(err);
          });
        }
      };

      if (options.getSize) {
        async.waterfall([
          function(callback) {
            try {
              gm(file.path).size(function(err, size) {
                if (err) {
                  if (options.error) {
                    options.error(err);
                  }
                  callback(err);
                } else {
                  callback(null, size);
                }
              });
            } catch (e) {
              if (options.error) {
                options.error(e);
              }
              callback(e);
            }
          },
          function(size, callback) {
            doSuccess(size);
            callback();
          }
        ]);
      } else {
        doSuccess(-1);
      }

    });
  } catch (e) {
    if (options.error) {
      options.error(e);
    }
  }

};