'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  crypto = require('crypto');

var Feedback = new Schema({
  //反馈人,可能没有?
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  //true已读 false未读
  read: {
    type: Boolean,
    default: false
  },
  //图片
  photos: [{
    uri: String
  }],
  //反馈的内容
  content: String,
  createTime: {
    type: Date,
    default: Date.now
  }
})

mongoose.model('Feedback', Feedback);