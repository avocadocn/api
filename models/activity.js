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
  member_min: {//最少人数
    type: Number,
    default: 0
  },
  member_max: {//人数上限
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
  start_time: Date,
  end_time: Date,
  deadline: Date,
  //活动类型,篮球等
  campaign_mold: String,
  //活动组件
  components: [
    {
      name: String,
      _id: Schema.Types.ObjectId
    }
  ]
});


mongoose.model('Activity', Activity);


