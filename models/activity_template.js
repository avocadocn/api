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
  //活动类型,篮球等
  activityMold: String,
  create_time: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('ActivityTemplate', ActivityTemplate);