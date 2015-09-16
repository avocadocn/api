'use strict';
//活动模板
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var ActivityTemplate = new Schema({
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
  memberMin: {//最少人数
    type: Number,
    default: 0
  },
  memberMax: {//人数上限
    type: Number,
    default: 0
  },
  location: {
    loc: {
      type: {
        type: String,
        default: 'Point'
      },
      coordinates: []
    },
    name: String
  },
  startTime: Date,
  endTime: Date,
  deadline: Date,
  //活动类型,篮球等
  activityMold: String,
  createTime: {
    type: Date,
    default: Date.now
  },
  tags: [String],
  active:  {
    type: Boolean,
    default: true
  },
  forwarding:  {
    type: Number,
    default: 0
  }
});

mongoose.model('ActivityTemplate', ActivityTemplate);