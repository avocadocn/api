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
  // 接收者id
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  //接收者性别
  receiverGender: {
    type: Number,
    enum: [1,2] //1为男 2为女
  },
  //送的礼物,以数字代表
  giftIndex: {
    type: Number,
    required: true,
    enum: [1,2,3,4,5] //1鲜花 2咖啡 3拥抱 4爱心 5蛋糕
  },
  //送礼时间
  createTime: {
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
  //是回复哪个礼物的
  replyGift: {
    type: Schema.Types.ObjectId,
    ref: 'Gift'
  }
  //以后可增加匿名与否
});

mongoose.model('Gift', Gift);