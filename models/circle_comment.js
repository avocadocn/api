'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// var user = {
//   _id: {
//     type: Schema.Types.ObjectId,
//     required: true
//   },
//   // 评论消息列表显示状态
//   list_status: {
//     type: String,
//     enum: ['show', 'delete'],
//     default: 'show'
//   }
// };

var CircleComment = new Schema({

  // 类型，评论或赞
  kind: {
    type: String,
    enum: ['comment', 'appreciate'],
    required: true
  },
  content: String,

  // 是否仅仅是回复消息，而不是对用户
  isOnlyToContent: {
    type: Boolean,
    default: true,
    required: true
  },

  // # 评论目标消息的id
  targetContentId: {
    type: Schema.Types.ObjectId,
    required: true
  },

  // 评论目标用户的id(直接回复消息则保存消息发布者的id)
  targetUserId: {
    type: Schema.Types.ObjectId,
    required: true
  },

  postUserCid: {
    type: Schema.Types.ObjectId, // 发评论或赞的用户的公司id
    required: true
  },

  postUserId: {
    type: Schema.Types.ObjectId, // 发评论或赞的用户的id（头像和昵称再次查询）
    required: true
  },
  postDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['show', 'delete', 'content_delete'],
    default: 'show'
  },
  // 与该评论相关的用户集合
  // relative_user: [user]
});

mongoose.model('CircleComment', CircleComment);
