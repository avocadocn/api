'use strict';

var mongoose = require('mongoose');
var validator = require('validator');

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
  }
};

mongoose.model('PhotoAlbum', PhotoAlbum);