'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var _member = {
  type: Schema.Types.ObjectId,
  ref: 'User'
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
  theme: {//主题
    type: String,
    required: true
  },
  content: {//简介
    type: String
  },
  end_time: Date,
  option: [_option]
});

mongoose.model('Poll', Poll);


