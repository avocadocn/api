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
/**
 * 求助
 */
var Question = new Schema({
  theme: {//主题
    type: String,
    required: true
  },
  content: {//简介
    type: String
  },
  end_time: Date,
  select: {
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }
});

mongoose.model('Question', Question);


