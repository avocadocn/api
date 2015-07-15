'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
//礼物
var Gift = new Schema({
  // 发送者id
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // 接受者id
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  //送的礼物,以数字
  gift: {
    type: Number,
    enum: [1,2,3,4,5] //
  },
  //送礼时间
  create_time: {
    type: Date,
    default: Date.now
  },
  //是否已接受
  received: {
    type: Boolean,
    default: false
  },
  //礼物所属公司
  cid: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  replyGift: {
    type: Schema.Types.ObjectId,
    ref: 'Gift'
  }
});

mongoose.model('Gift', Gift);