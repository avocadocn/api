'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var PhotoAlbum = mongoose.model('PhotoAlbum');

var chance = require('chance').Chance();
var moment = require('moment');

/**
 * 创建小队相册
 * example:
 *  createPhotoAlbums({
 *    model: doc,
 *    users: [doc],
 *    leaders: [doc],
 *    campaigns: [doc]
 *  });
 *  调用完该方法后会添加photoAlbums属性，使参数team变为:
 *  {
 *    model: doc,
 *    users: [doc],
 *    leaders: [doc],
 *    campaigns: [doc],
 *    photoAlbums: [doc] // 0和1用于删除测试
 *  }
 *  该方法是异步的，但是并无必要提供全部成功后的回调，没有其它方法需要依赖于该方法
 * @param {Object} team
 */
var createPhotoAlbums = function (team) {
  // 随机创建相册数
  team.photoAlbums = [];
  var randomAlbumCount = chance.integer({ min: 10, max: 20 });
  if (team.leaders.length < 1) {
    return;
  }
  var leader = team.leaders[0];
  var createUser = {
    _id: leader._id,
    name: leader.nickname,
    type: 'user'
  };
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
      photoAlbum.save(function (err) {
        if (err) {
          console.log('创建小队相册失败');
          console.log(err);
        } else {
          team.photoAlbums.push(photoAlbum);
        }
      });
    }());
  }


};

module.exports = createPhotoAlbums;