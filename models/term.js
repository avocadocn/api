'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

//抢场地活动的期
var Term = new Schema({
  create_time: {
    type: Date,
    default: Date.now
  },
  start_time: Date, //本期抢购开始时间（比如某周开始）
  end_time: Date,   //本期抢购结束时间（不如同周结束）
  content: String   //描述
});

mongoose.model('Term', Term);