/**
 * 文件api的控制器
 * CahaVar <cahavar@55yali.com> 于2015-03-17创建
 */

// node modules
var path = require('path'),
  fs = require('fs');

// npm packages
var multiparty = require('multiparty'),
  gm = require('gm'),
  mime = require('mime'),
  mkdirp = require('mkdirp'),
  async = require('async'),
  moment = require('moment');

// mongoose and models
var mongoose = require('mongoose'),
  File = mongoose.model('File'),
  CircleContent = mongoose.model('CircleContent');

/**
 * 目录设定
 * 要求api项目与yali项目在同一目录下
 */
var yaliDir = path.join(__dirname, '../../yali/'); // yali网站目录
var tempDir = path.join(yaliDir, 'temp_uploads'); // yali网站上传文件的临时目录

module.exports = function (app) {
  return {

    /**
     * 上传文件的api对应的控制器
     * CahaVar <cahavar@55yali.com> 于2015-03-17创建
     *
     * 请求主体:
     *  owner: {
     *    kind: String, // 该文件所属模型的名称,
     *    _id: String, // 该文件所属模型的_id
     *  },
     *  files: // 文件，一个或多个
     */
    upload: function (req, res, next) {
      var form = new multiparty.Form({
        uploadDir: tempDir
      });

      form.parse(req, parseForm);

      function parseForm(err, fields, files) {
        if (err) {
          next(err);
          return;
        }

        var data = {};

        async.series([
          function (callback) {
            // 权限验证
            if (!fields['owner'][0]) {
              res.status(400).send({msg: '上传文件须指定所属对象'});
              callback('break');
              return;
            }
            authUpload(fields['owner'][0], req.user, function (err, canUpload) {
              if (err) {
                callback(err);
              }
              else {
                if (canUpload) {
                  callback();
                }
                else {
                  res.status(403).send({msg: '您没有权限'});
                  callback('break');
                }
              }
            });
          },
          function (callback) {
            // 将文件从临时目录移到存档目录(并设为只读，不可写和执行)
            if (!files['files']) {
              res.status(400).send({msg: '没有上传文件'});
              callback('break');
              return;
            }
            moveFilesFromTempDirToBackupDir(files['files'], function (err, fileDatas) {
              if (err) {
                callback(err);
              }
              else {
                data.fileDatas = fileDatas;
                callback();
              }
            });
          },
          function (callback) {
            // TODO: 特殊类型特殊处理(是公开的图片类用gm写到public目录)
            callback(); // TODO
          },
          function (callback) {
            // 新建并保存数据模型
            var uploader = {
              _id: req.user._id,
              kind: req.user.provider,
              cid: req.user.getCid()
            };
            var owner = {
              kind: fields['owner'][0].kind,
              _id: fields['owner'][0]._id
            };
            data.fileDatas.forEach(function (fileData) {
              fileData.uploader = uploader;
              fileData.owner = owner;
            });
            createAndSaveFileModel(data.fileDatas, callback);
          }
        ], function (err, results) {
          if (err) {
            if (err === 'break') {
              return;
            }
            next(err);
          }
          else {
            res.send({msg: '上传成功'});
          }
        });

      }

    }

  };
};

/**
 * util functions
 */

/**
 * 验证是否有权限上传
 * @param {{kind: String, _id: String}} owner 该文件所属的模型
 * @param {User} user 上传者
 * @param {Function} callback 形式为function (err, canUpload) {}, 参数canUpload为Boolean类型，如果有权限上传则为true，否则为false
 */
function authUpload(owner, user, callback) {
  // TODO
  callback(null, true);
}

/**
 * 将多个上传的文件从临时目录移动到备份目录
 *
 * example:
 *  moveFilesFromTempDirToBackupDir(files, function (err, fileDatas) {
 *    // do something
 *  });
 *
 *  fileDatas是一个数组: [{
 *    originName: String, // 上传的原文件名
 *    name: String, // 重命名后的文件名
 *    path: String // 保存后的路径，相对于yali网站目录的路径，如'/backup/2015/03/cid/test.png'
 *  }]
 *
 * @param {Array} files 文件数组
 * @param {Function} callback 形式为function (err, fileDatas) {}
 */
function moveFilesFromTempDirToBackupDir(files, callback) {
  async.map(files, function (file, mapCallback) {
    moveFileFromTempDirToBackupDir(file, mapCallback);
  }, callback);
}

/**
 * 将一个上传的文件从临时目录移动到备份目录
 *
 * example:
 *  moveFileFromTempDirToBackupDir(files, function (err, resFileData) {
 *    // do something
 *  });
 *
 *  resFileData: {
 *    originName: String, // 上传的原文件名
 *    name: String, // 重命名后的文件名
 *    path: String // 保存后的路径，相对于yali网站目录的路径，如'/backup/2015/03/cid/test.png'
 *  }
 *
 * @param {Object} file 文件数据
 * @param {ObjectId|String} cid 上传者所属的公司id
 * @param {Function} callback 形式为function (err, resFileData) {}
 */
function moveFileFromTempDirToBackupDir(file, cid, callback) {
  var resFileData;
  var backupDir = path.join(yaliDir, 'backup', createDateCidDir(cid));
  var newDateName = createNewDateName(file);
  async.series([
    function (seriesCallback) {
      // create backup dir if not exists
      fs.exists(backupDir, function (err, isExists) {
        if (err) {
          seriesCallback(err);
        }
        else {
          if (isExists) {
            seriesCallback();
          }
          else {
            mkdirp(backupDir, seriesCallback);
          }
        }
      });

    },
    function (seriesCallback) {
      fs.rename(file.path, path.join(backupDir, newDateName), seriesCallback);
    }
  ], function (err, results) {
    if (err) {
      callback(err);
    }
    else {
      resFileData = {
        originName: file.originalFilename,
        name: newDateName,
        path: backupDir
      };
      callback(null, resFileData);
    }
  });
}

/**
 * 创建带日期和公司id的路径
 * @param {Object|String} cid
 * @returns {String} 返回路径字符串
 */
function createDateCidDir(cid) {
  return path.join(moment().format('YYYY/MM'), cid);
}

/**
 * 创建带日期的新文件名
 * @param {Object} file 文件数据
 * @returns {String} 返回文件名
 */
function createNewDateName(file) {
  var ext = mime.extension(file.headers['content-type']);
  var newDateName = Date.now().toString() + '.' + ext;
  return newDateName;
}

/**
 * 创建文件模型并保存
 *
 * example:
 *  createAndSaveFileModel([{
 *    originName: String, // 原文件名
 *    name: String, // 保存在服务器上的文件名
 *    path: String, // 服务器上的文件路径，相对于yali网站目录的路径
 *    uploader: { // 上传者
 *      _id: ObjectId|String, // 上传者_id
 *      kind: String, // 'user' or 'hr'
 *      cid: ObjectId|String // 上传者的公司id
 *    },
 *    owner: { // 文件所属的模型
 *      kind: String, // 模型名称
 *      _id: ObjectId|String // 模型_id
 *    }
 *  }], function (err) {});
 *
 * @param {Array} fileDatas 文件的相关数据
 * @param {Function} callback 形式为function (err) {}
 */
function createAndSaveFileModel(fileDatas, callback) {
  async.map(fileDatas, function (fileData, mapCallback) {
    var file = new File(fileData);
    file.save(mapCallback);
  }, callback);
}





