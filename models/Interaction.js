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
  cid:{
    type: Schema.Types.ObjectId,
    required: true
  },
  //互动类型 1:'活动',2:'投票',3:'求助'
  type:{
    type: Number,
    enum:[1,2,3],
    default: 1
  },
  //目标类型 1:'个人'（暂无）,2:'群',3:'公司'
  targetType:{
    type: Number,
    enum: [1,2,3],
    default: 2
  },
  //目标
  target:{
    type: Schema.Types.ObjectId,
    required: true
  },
  createTime:{
    type: Date,
    default: Date.now
  },
  //参与人员
  members: [_member],
  //参与人员
  inviters: [_member],
  //评论数
  // commentCount: Number,
  //状态 1:'正常',2:'结束',3:'删除'
  status:{
    type: Number,
    enum: [1,2,3],
    default: 1
  },
  //发布者
  poster: {
    _id: Schema.Types.ObjectId,
    role: {
      type:String,
      enum: ['user','leader','hr'],
      default:'user'
    }
  },
  theme: {//主题
    type: String,
    required: true
  },
  content: {//简介
    type: String
  },
  endTime: {
    type: Date
  },
  tags: [String],
  //对应内容的id Activity
  activity: {
    type: Schema.Types.ObjectId,
    ref: 'Activity'
  },
  //对应内容的id Poll
  poll: {
    type: Schema.Types.ObjectId,
    ref: 'Poll'
  },
  //对应内容的id Question
  question: {
    type: Schema.Types.ObjectId,
    ref: 'Question'
  },
  //修改时间
  updateTime: Date,
  public: {
    type: Boolean,
    default: true
  },
});

mongoose.model('Interaction', Interaction);