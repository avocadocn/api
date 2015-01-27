'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var PhotoAlbum = mongoose.model('PhotoAlbum');

var chance = require('chance').Chance();
var moment = require('moment');
var async = require('async');

/**
 * 创建小队相册
 * example:
 *  createPhotoAlbums({
 *    model: doc,
 *    users: [doc],
 *    leaders: [doc],
 *    campaigns: [doc]
 *  }, function (err) {});
 *  调用完该方法后会添加photoAlbums属性，使参数team变为:
 *  {
 *    model: doc,
 *    users: [doc],
 *    leaders: [doc],
 *    campaigns: [doc],
 *    photoAlbums: [doc] // 0和1用于删除测试，2用于上传测试
 *  }
 * @param {Object} team
 * @param {Function} callback function(err) {}
 */
var createPhotoAlbums = function (team, callback) {
  // 随机创建相册数
  team.photoAlbums = [];
  var randomAlbumCount = chance.integer({ min: 10, max: 20 });
  if (team.leaders.length < 1) {
    callback();
    return;
  }
  var leader = team.leaders[0];
  var createUser = {
    _id: leader._id,
    name: leader.nickname,
    type: 'user'
  };
  var photoAlbums = [];
  for (var i = 0; i < randomAlbumCount; i++) {
    (function () {
      var photoAlbum = new PhotoAlbum({
        owner: {
          model: {
            _id: team.model._id,
            type: 'CompanyGroup'
          },
          companies: [team.model.cid],
          teams: [team.model._id]
        },
        name: 'testPhotoAlbumName',
        update_user: createUser,
        create_user: createUser
      });
      photoAlbums.push(photoAlbum);
    }());
  }

  async.map(photoAlbums, function (photoAlbum, mapCallback) {
    photoAlbum.save(function (err) {
      if (err) {
        console.log('创建小队相册失败');
        mapCallback(err);
      } else {
        team.photoAlbums.push(photoAlbum);
        mapCallback();
      }
    });
  }, function (err, results) {
    callback(err);
  });

};

module.exports = createPhotoAlbums;