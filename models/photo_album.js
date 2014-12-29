'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Photo = new Schema({
  uri: String,
  upload_date: {
    type: Date,
    default: Date.now
  },
  click: {
    type: Number,
    default: 0
  },
  width: Number,
  height: Number,
  name: String,
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
  photos: [Photo], // 12.12起只保存最近的20张
  // 最近20张照片列表是否可靠
  reliable: {
    type: Boolean,
    default: true
  },
  photo_count: {
    type: Number,
    default: 0
  }
});

PhotoAlbum.methods = {

  pushPhoto: function (photo) {
    var maxLatestPhotoLength = 20;
    if (this.photos.length < maxLatestPhotoLength) {
      this.photos.push(photo);
    } else {
      this.photos.splice(0, this.photos.length - maxLatestPhotoLength + 1);
      this.photos.push(photo);
    }
  }
};

mongoose.model('PhotoAlbum', PhotoAlbum);

