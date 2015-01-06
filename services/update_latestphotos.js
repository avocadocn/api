'use strict';

var mongoose = require('mongoose');
var PhotoAlbum = mongoose.model('PhotoAlbum');
var Photo = mongoose.model('Photo');

var async = require('async');

/**
 * 按照点击数由大到小排序照片
 * @param  {Object} a Photo model
 * @param  {Object} b
 * @return {Boolean}
 */
var sortByClick = function(a, b) {
  // 兼容旧数据，旧的数据没有click属性
  if (!a.click) {
    a.click = 0;
  }
  if (!b.click) {
    b.click = 0;
  }
  return b.click - a.click;
};

var sortByUploadDate = function(a, b) {
  return  b.upload_date - a.upload_date;
};

/**
 * 更新相册最近的照片
 * @param {Object} photoAlbum
 * @param {Object} callback 形式为function(err, photos)
 */
var updateLatestPhotos = function (photoAlbum, callback) {
  Photo.find({
    photo_album: photoAlbum._id,
    hidden: false
  }, {
    _id: true,
    uri: true,
    upload_date: true,
    click: true,
    name: true
  })
    .sort('-upload_date')
    .limit(10)
    .exec()
    .then(function (photos) {
      photoAlbum.photos = photos;
      photoAlbum.reliable = true;
      photoAlbum.save(function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null, photos);
        }
      });
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 更新最新照片列表不可靠的相册
 * @param photoAlbums
 * @param callback 形式为function(err)
 */
var updateIfNotReliable = function (photoAlbums, callback) {
  async.map(photoAlbums, function (photoAlbum, itemCallback) {
    if (photoAlbum.reliable === false) {
      updateLatestPhotos(photoAlbum, function (err) {
        itemCallback(err);
      });
    } else {
      itemCallback();
    }
  }, function (err) {
    callback(err);
  });
};

exports.getLatestPhotos = function (photoAlbum, count, callback) {
  if (!count) {
    count = 4;
  } else if (count > photoAlbum.photos.length) {
    count = photoAlbum.photos.length;
  }
  var photoList = photoAlbum.photos.slice(0, photoAlbum.photos.length);
  photoList.sort(sortByUploadDate);
  photoList.sort(sortByClick);
  // todo 目前该方法有10个地方在用，尽管可以改成异步方法使得能百分百保证获取到正确数据，但改动代价太大，目前处于开发app阶段，不应该在这里消耗太多时间
  // todo 故采取较优方案：如果照片列表已被标记不可靠，则第一次取的时候仍然取原列表，但去更新这个列表，更新成功后以后就是可靠数据了
  // todo 另外再提供一个可以异步获取可靠数据的回调函数，以便于某些需要可靠数据的地方。
  // todo 在现阶段这是最优解决方案
  updateIfNotReliable([photoAlbum], function (err) {
    if (err) {
      callback && callback(err);
    } else {
      var photoList = photoAlbum.photos.slice(0, photoAlbum.photos.length);
      photoList.sort(sortByUploadDate);
      photoList.sort(sortByClick);
      callback && callback(null, photoList);
    }
  });
  return photoList.slice(0, count);
};