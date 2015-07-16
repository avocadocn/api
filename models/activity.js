'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * 活动
 */
var Activity = new Schema({
  theme: {//主题
    type: String,
    required: true
  },
  content: {//简介
    type: String
  },
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
  activityMold: String
});


mongoose.model('Activity', Activity);


