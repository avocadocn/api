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
  async = require('async');

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

        var data = {};

        async.waterfall([
          function (callback) {
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
            // TODO: 将文件从临时目录移到存档目录(并设为只读，不可写和执行)
            if (!files['files']) {
              res.status(400).send({msg: '没有上传文件'});
              callback('break');
              return;
            }
            moveFilesFromTempDirToBackupDir(files['files'], function (err, resFiles) {
              if (err) {
                callback(err);
              }
              else {
                data.resFiles = resFiles;
                callback();
              }
            });
          },
          function (callback) {
            // TODO: 特殊类型特殊处理(是公开的图片类用gm写到public目录)
            callback(); // TODO
          },
          function (callback) {
            // TODO: 新建并保存数据模型
            var uploader = {
              _id: req.user._id,
              kind: req.user.provider,
              cid: req.user.getCid()
            };
            var owner = {
              kind: fields['owner'][0].kind,
              _id: fields['owner'][0]._id
            };
            data.resFiles.forEach(function (fileData) {
              fileData.uploader = uploader;
              fileData.owner = owner;
            });
            createAndSaveFileModel(data.resFiles, callback);
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
}

/**
 * 将上传的文件从临时目录移动到备份目录
 *
 * example:
 *  moveFilesFromTempDirToBackupDir(files, function (err, files) {
 *
 *  });
 *
 *  files是一个数组: [{
 *    originName: String, // 上传的原文件名
 *    name: String, // 重命名后的文件名
 *    path: String // 保存后的路径，相对于yali网站目录的路径，如'/backup/2015/03/cid/test.png'
 *  }]
 *
 * @param {Array} files 文件数组
 * @param {Function} callback 形式为function (err, files) {}
 */
function moveFilesFromTempDirToBackupDir(files, callback) {
  // TODO
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
  // TODO
}





