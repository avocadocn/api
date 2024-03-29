'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var QuestionComment = new Schema({

  content: String,
  // 评论所属的求助Id
  interactionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  // 评论一个评论时的评论Id,直接评论投票时为空
  commentId: Schema.Types.ObjectId,
  targetUser: {
    type: Schema.Types.ObjectId,
    ref: "User"
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
  approveCount: {
    type:Number,
    default: 0
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

mongoose.model('QuestionComment', QuestionComment);
