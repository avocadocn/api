'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
//礼物
var Gift = new Schema({
  // 发送者id
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 接受者id
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  //送的礼物,以数字代表
  gift_index: {
    type: Number,
    required: true,
    enum: [1,2,3,4,5] //1鲜花 2咖啡 3拥抱 4爱心 5蛋糕
  },
  //送礼时间
  create_time: {
    type: Date,
    default: Date.now
  },
  //附言
  addition: String,
  //是否已接收
  received: {
    type: Boolean,
    default: false
  },
  //礼物所属公司
  cid: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  reply_gift: {
    type: Schema.Types.ObjectId,
    ref: 'Gift'
  }
});

mongoose.model('Gift', Gift);