'use strict';

/**
 * Module dependencies.
 */
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
var _option = {
  index: Number,
  value: String,
  voters:[_member]
}
/**
 * 投票
 */
var Poll = new Schema({
  option: [_option]
});

mongoose.model('Poll', Poll);


