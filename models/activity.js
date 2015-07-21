'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var _member = {
  _id:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  createTime: {
    type: Date,
    default: Date.now
  }
}
/**
 * 活动
 */
var Activity = new Schema({
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
  members: [_member],
  quitMembers: [_member],
  startTime: Date,
  deadline: Date,
  //活动类型,篮球等
  activityMold: String,
  template:{
    type: Schema.Types.ObjectId,
    ref: 'ActivityTemplate'
  }
});


mongoose.model('Activity', Activity);


