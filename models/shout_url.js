'use strict';
/**
 * 短网址模型
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ShortUrl = new Schema({
  //短网址里的id
  shortId: {
    type: String,
    unique: true
  },
  //对应长url
  url: String
});

mongoose.model('ShortUrl', ShortUrl);
