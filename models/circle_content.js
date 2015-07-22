'use strict';
/**
 * 数据模型依赖项
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * 数据模型依赖组件
 */
var user = { //同事圈评论、点赞的成员组件
  _id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  comment_num: {
    type: Number,
    required: true
  },
  // 参与评论者是否点赞
  appreciated: {
    type: Boolean,
    default: false,
    required: true
  }
};

var CircleContent = new Schema({
  cid: { // 所属公司id
    type: Schema.Types.ObjectId,
    required: true
  },

  tid: [Schema.Types.ObjectId], // 关联的小队id(无用)
  campaign_id: Schema.Types.ObjectId, // 关联的活动id(无用)

  content: String, // 文本内容(content和photos至少要有一个)

  photos: [{ // 照片列表
    uri: String,
    width: Number,
    height: Number
  }],

  post_user_id: { // 发消息的用户的id（头像和昵称再次查询）
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },

  // 发消息用户所属小队id，若为空，则该消息属于公司活动(无用)
  post_user_tid: Schema.Types.ObjectId,

  post_date: { // 同事圈发送时间
    type: Date,
    default: Date.now,
    required: true
  },

  /**
   * show: 正常显示
   * delete: 删除标记，不再显示
   * wait: 等待图片资源上传
   */
  status: { // wait或许已经无用
    type: String,
    enum: ['show', 'delete', 'wait'],
    required: true,
    default: 'show'
  },
  // 最新评论时间
  latest_comment_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  comment_users: [user], // 参与过评论的用户
  relative_cids: [Schema.Types.ObjectId] // 参加同事圈消息所属的活动的所有公司id(无用)
});

CircleContent.pre('save', function (next) {
  if (this.status === 'show' && (!this.content || this.content === '') && (!this.photos || this.photos.length === 0)) {
    next(new Error('content或photos属性都为空'));
  } else {
    next();
  }
});

mongoose.model('CircleContent', CircleContent);
