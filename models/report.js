//评论数据结构

'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Report = new Schema({
  host_type:{
    type: String,
    enum: ['album', 'campaign', 'photo', 'comment', 'user', 'company']
  },
  host_id: Schema.Types.ObjectId,  //留言主体的id,这个主体可以是 一条活动、一条评论、一张照片、一场比赛等等
  //举报的补充
  content: String,
  report_type:Number,
  //0:淫秽色情
  //1:敏感信息
  //2:垃圾营销
  //3:诈骗
  //4:人身攻击
  //5:泄露我的隐私
  // 6: 虚假资料
  create_date:{
    type:Date,
    default: Date.now
  },
  deal_date:{
    type:Date,
    default: Date.now
  },
  //举报人
  poster:{
    poster_type:{
      type:String,
      enum:['user','company']
    },
    uid:Schema.Types.ObjectId,
    cid:Schema.Types.ObjectId
  },
  status:{
    type: String,
    enum:['active','inactive','verifying'],
    default: 'verifying'
  }
});

mongoose.model('Report', Report);