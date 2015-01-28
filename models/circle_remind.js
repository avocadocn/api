'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CircleRemind = new Schema({
  uid: Schema.Types.ObjectId, // 消息提醒列表所有者id(每个用户都会有一个这样的文档)
  has_new_content: Boolean, // 有没有同事发新消息
  msg_list: [{
    // 类型：新的评论或赞
    kind: {
      type: String,
      enum: ['newComment', 'newAppreciate'],
      required: true
    },

    // 发赞或评论的用户
    post_user: {
      _id: {
        type: Schema.Types.ObjectId,
        required: true
      },
      photo: {
        type: String,
        required: true
      },
      nickname: {
        type: String,
        required: true
      }
    },
    content: String // 评论内容
  }],
  clear_date: Date // 上次清空消息列表的时间
});

mongoose.model('CircleRemind', CircleRemind);