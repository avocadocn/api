//互动

'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var _member = {
  type: Schema.Types.ObjectId,
  ref: 'User'
}
var Interaction = new Schema({
  //公共属性
  cid: Schema.Types.ObjectId,
  //互动类型 1:'活动',2:'投票',3:'求助'
  type:{
    type: Number,
    enum:[1,2,3],
    default: 1
  },
  //目标类型 1:'个人',2:'群',3:'公司'
  target_type:{
    type: Number,
    enum: [1,2,3],
    default: 2
  },
  //目标
  target:Schema.Types.ObjectId,
  create_time:{
    type: Date,
    default: Date.now
  },
  //参与人员
  member: [_member],
  //评论数
  comment_count: Number,
  //状态 1:'正常',2:'结束',3:'删除'
  status:{
    type: Number,
    enum: [1,2,3],
    default: 1
  },
  //发布者
  poster: _member,

  //对应内容的id Activity Poll Question
  content: Schema.Types.ObjectId,

  //修改时间
  update_time: Date
});

mongoose.model('Interaction', Interaction);