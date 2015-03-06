'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

//问题
var Question = new Schema({
  group_type: String, //同Group的group_type属性
  content: String, //问题内容
  answer: String, //问题答案
})


mongoose.model('Question', Question);
