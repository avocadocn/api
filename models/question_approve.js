'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var QuestionApprove = new Schema({

  // 赞所属的求助Id
  interactionId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  // 赞的评论Id
  commentId: {
    type: Schema.Types.ObjectId,
    ref: "QuestionComment",
    required: true
  },
  // 赞的用户的公司id
  postCid: {
    type: Schema.Types.ObjectId,
    required: true
  },
  // 赞的用户的id（头像和昵称再次查询）
  postId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createTime: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('QuestionApprove', QuestionApprove);
