'use strict';

/**
 * 数据模型依赖项
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * 数据模型依赖组件
 */
var _member = new Schema({ // 榜单成员组件
  _id: { // 成员id
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  nickname: String, // 成员昵称
  photo: String, // 成员头像
  score: {
    type: Number,
    required: true,
    default: 0
  }
});

/**
 * 榜单数据模型
 */
var BillBoardModel = new Schema({
  cid: { // 公司id
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  cname: String, // 公司名称

  member: [_member], //榜单前十名

  type: { // 榜单种类
    type: Number,
    enum:[1, 2, 3], //1男神榜 2女神榜 3人气榜
    required: true
  },

  createTime: { // 创建时间(每周的最后零点)
    type: Date,
    required: true
  }
});

mongoose.model('BillBoard', BillBoardModel);