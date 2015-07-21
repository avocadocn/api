'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
/**
 * 求助
 */
var Question = new Schema({
  select: {
    type: Schema.Types.ObjectId,
    ref: 'QuestionComment'
  }
});

mongoose.model('Question', Question);


