'use strict';
//投票模板
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var _option = {
  index: Number,
  value: String
}
var PollTemplate = new Schema({
  theme: {//主题
    type: String,
    required: true
  },
  content: {//简介
    type: String
  },
  photos: [{ // 照片列表
    uri: String,
    width: Number,
    height: Number
  }],
  option: [_option],
  tags:[String],
  endTime: Date,
  createTime: {
    type: Date,
    default: Date.now
  },
  active:  {
    type: Boolean,
    default: true
  }
});

mongoose.model('PollTemplate', PollTemplate);