'use strict';

// 确保在这之前已经使用mongoose连接数据库并已经初始化model
var mongoose = require('mongoose');
var User = mongoose.model('User');

var scoreItems = {
  officialCampaignSucceded: 10, // 参加的官方小队活动成功结束
  joinOfficialTeam: 5, // 参加官方小队
  quitOfficialTeam: -5, // 退出官方小队
  uploadPhotoToOfficialTeam: 0 // 上传照片到官方小队相册
};
exports.scoreItems = scoreItems;
/**
 * 添加用户积分
 * example:
 *  addScore(req.body.uid, {
 *    joinOfficialTeam: 1, // 后面是计数，表示这个项目的积分要加几次
 *    uploadPhotoToOfficialTeam: 5 // 上传了5张照片
 *  }, function(err) {})
 *  // 在已经获取到user的情况下，可以直接传入user以减少查询
 *  addScore(req.user, {
 *    joinOfficialTeam: 1, // 后面是计数，表示这个项目的积分要加几次
 *    uploadPhotoToOfficialTeam: 5 // 上传了5张照片
 *  }, {
 *    save: false
 *  }, function(err, user) {})
 * @param {String|Object} user 可以是用户的id，也可以是mongoose.model('User')的实例
 * @param {Object} itemsObj 积分项目描述
 * @param {Object} options 其它配置选项，可设置是保存用户信息
 * @param {Function} callback 执行完更新积分服务后的回调函数，形式为function(err[, user])
 */
exports.addScore = function (user, itemsObj, options, callback) {

  var _options = {
    save: true
  };

  if (typeof options === 'function') {
    callback = options;
  } else {
    _options = options;
  }

  var scoresObj = {};
  for (var key in itemsObj) {
    var count = itemsObj[key];
    if (scoreItems[key]) {
      var score = scoreItems[key] * count;
      scoresObj[key] = score;
    }
  }

  var updateUserScore = function (user) {
    if (!user.score) {
      user.score = {
        total: 0,
        officialCampaignSucceded: 0,
        joinOfficialTeam: 0,
        quitOfficialTeam: 0,
        uploadPhotoToOfficialTeam: 0
      }
    }
    var sum = 0;
    for (var key in scoresObj) {
      user.score[key] += scoresObj[key];
      sum += scoresObj[key];
    }
    user.score.total += sum;
    if (_options.save === true) {
      user.save(callback);
    } else {
      callback(null, user);
    }

  };

  if (user.constructor.modelName === 'User') {
    updateUserScore(user);
  } else {
    User.findById(user).exec()
      .then(function (user) {
        if (!user) {
          callback('not found');
          return;
        }
        updateUserScore(user);
      })
      .then(null, function (err) {
        callback(err);
      });
  }

};
