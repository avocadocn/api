'use strict';
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var user = {
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

  // 所属公司id
  cid: {
    type: Schema.Types.ObjectId,
    required: true
  },

  tid: [Schema.Types.ObjectId], // 关联的小队id(可选，不是必要的)
  campaign_id: Schema.Types.ObjectId, // 关联的活动id(可选，不是必要的)
  content: String, // 文本内容(content和photos至少要有一个)

  // 照片列表
  photos: [{
    uri: String,
    width: Number,
    height: Number
  }],

  // 发消息的用户的id（头像和昵称再次查询）
  post_user_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  
  post_date: {
    type: Date,
    default: Date.now,
    required: true
  },

  /**
   * show: 正常显示
   * delete: 删除标记，不再显示
   * wait: 等待图片资源上传
   */
  status: {
    type: String,
    enum: ['show', 'delete', 'wait'],
    required: true,
    default: 'show'
  },
  // // 发布者是否点赞
  // appreciated: {
  //   type: Boolean,
  //   default: false,
  //   required: true
  // },
  // 最新评论时间
  latest_comment_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  comment_users: [user], // 参与过评论的用户
  relative_cids: [Schema.Types.ObjectId] // 参加同事圈消息所属的活动的所有公司id
});

CircleContent.pre('save', function (next) {
  if ((!this.content || this.content === '') && (!this.photos || this.photos.length === 0)) {
    next(new Error('content或photos属性都为空'));
  } else {
    next();
  }
});

mongoose.model('CircleContent', CircleContent);