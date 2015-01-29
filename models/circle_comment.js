'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CircleComment = new Schema({

  // 类型，评论或赞
  kind: {
    type: String,
    enum: ['comment', 'appreciate'],
    required: true
  },
  content: String,

  // 是否仅仅是回复消息，而不是对用户
  is_only_to_content: {
    type: Boolean,
    default: true,
    required: true
  },

  // # 评论目标消息的id
  target_content_id: {
    type: Schema.Types.ObjectId,
    required: true
  },

  // 评论目标用户的id(直接回复消息则保存消息发布者的id)
  target_user_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  post_user_cid: {
    type: Schema.Types.ObjectId, // 发评论或赞的用户的公司id
    required: true
  },
  post_user_id: {
    type: Schema.Types.ObjectId, // 发评论或赞的用户的id（头像和昵称再次查询）
    required: true
  },
  post_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['show', 'delete'],
    default: 'show'
  }
});

mongoose.model('CircleComment', CircleComment);
