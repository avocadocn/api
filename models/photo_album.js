'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Photo = new Schema({
  uri: String,
  thumbnail_uri: String,
  zoom_uri: String,
  upload_date: {
    type: Date,
    default: Date.now
  },
  hidden: {
    type: Boolean,
    default: false
  },
  click: {
    type: Number,
    default: 0
  },
  name: String,
  tags: [String],
  upload_user: {
    _id: Schema.Types.ObjectId,
    name: String,
    type: {
      type: String,
      enum: ['user', 'hr']
    }
  }
});


var PhotoAlbum = new Schema({
  owner: {
    model: {
      _id: Schema.Types.ObjectId,
      type: {
        type: String,
        enum: ['Campaign', 'CompanyGroup']
      }
    },
    companies: [{
      type: Schema.Types.ObjectId,
      ref: 'Company'
    }],
    teams: [{
      type: Schema.Types.ObjectId,
      ref: 'CompanyGroup'
    }]
  },
  name: {
    type: String,
    default: '相册'
  },
  create_date: {
    type: Date,
    default: Date.now
  },
  create_user: {
    _id: Schema.Types.ObjectId,
    name: String,
    type: {
      type: String,
      enum: ['user', 'hr']
    }
  },
  update_user: {
    _id: Schema.Types.ObjectId,
    name: String,
    type: {
      type: String,
      enum: ['user', 'hr']
    }
  },
  update_date: {
    type: Date,
    default: Date.now
  },
  hidden: {
    type: Boolean,
    default: false
  },
  photos: [Photo],
  photo_count: {
    type: Number,
    default: 0
  }
});

PhotoAlbum.statics = {
  /**
   * 创建相册
   * @param {String} name 相册名
   * @param {Object} owner 相册所属
   * @param {Object} user 创建者，将req.user传入即可
   * @return {Object} PhotoAlbum实例
   * @constructor
   */
  New: function (name, owner, user) {
    var photoAlbum = new this({
      name: name,
      owner: owner
    });
    if (user.provider === 'user') {
      photoAlbum.create_user = {
        _id: user._id,
        name: user.nickname,
        type: 'user'
      }
    } else if (user.provider === 'company') {
      photoAlbum.create_user = {
        _id: user._id,
        name: user.info.name,
        type: 'hr'
      };
    }
    photoAlbum.update_user = photoAlbum.create_user;
    return photoAlbum;
  }
};

PhotoAlbum.methods = {
  // 校正照片计数
  correctPhotoCount: function () {
    var count = 0;
    for (var i = 0; i < this.photos.length; i++) {
      if (!this.photos[i].hidden) {
        count++;
      }
    }
    this.photo_count = count;
  },

  // 获取没有删除的照片
  getPhotos: function () {
    return this.photos.filter(function (photo) {
      return !photo.hidden;
    });
  },

  /**
   * 获取某一张照片
   * @param {Object|String} id 照片id
   * @returns {Object}
   */
  getPhoto: function (id) {
    var photo;
    for (var i = 0; i < this.photos.length; i++) {
      if (this.photos[i]._id.toString() === id.toString()) {
        if (this.photos[i].hidden === false) {
          photo = this.photos[i];
        }
        break;
      }
    }
    return photo;
  }
};

mongoose.model('PhotoAlbum', PhotoAlbum);