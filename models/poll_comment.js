'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PollComment = new Schema({

  content: String,

  // 评论所属的投票Id
  interactionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  // 发评论或赞的用户的公司id
  posterCid: {
    type: Schema.Types.ObjectId,
    required: true
  },
  // 发评论或赞的用户的id（头像和昵称再次查询）
  posterId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  createTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: Number,
    enum: [1,2,3], //1:正常，2:删除，3:内容删除
    default: 1
  }
});

mongoose.model('PollComment', PollComment);
