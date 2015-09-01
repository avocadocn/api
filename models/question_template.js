'use strict';
//求助模板
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var QuestionTemplate = new Schema({
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
  endTime: Date,
  createTime: {
    type: Date,
    default: Date.now
  },
  tags:[String],
  active:  {
    type: Boolean,
    default: true
  }
});

mongoose.model('QuestionTemplate', QuestionTemplate);