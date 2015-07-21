'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

//通知
var Notification = new Schema({
  //通知类型 1:互动 2:礼物 3:系统
  noticeType: {
    type: Number,
    enum: [1,2,3],
    required: true
  },
  //评论与互动才有的属性 1: 活动 2: 投票 3: 求助
  interactionType : {
    type: Number,
    enum:[1,2,3]
  },

  //非系统通知 以下三者选其一
  //Interaction
  inteactionId: {
    type: Schema.Types.ObjectId,
    ref: 'Interaction'
  },
  //礼物的id
  giftId: {
    type: Schema.Types.ObjectId,
    ref: 'Gift'
  },
  //小队的id
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },

  //- 互动：
  //互动的动作
  //  1: 活动有人参加了、投票有人参与了、求助有人回答了
  //  2: 被邀请参加活动、投票、求助
  //  2: 求助被采纳了
  //  3: 评论有回复
  //  4: 评论被赞了
  //  5: 被邀请进小队
  //  6: 入群申请被通过
  //送礼及系统无此属性
  action: {
    type: Number,
    enum: [1,2,3,4,5,6]
  },
  //若是自己的评论有回复了则有此属性
  replyId: Schema.Types.ObjectId,
  
  //可能很多人回答、参加 只有互动1、4 有此属性
  relativeCount: {
    type: Number
  }, 

  //礼物才有的属性 1: 送出 2: 拆开
  giftDirection: {
    type: Number,
    enum:[1,2]
  },
  
  //最新的那个人 若无则为系统
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  //若是系统则没有
  receiver: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  //通知时间
  createTime: {
    type: Date,
    default: Date.now
  }
})

mongoose.model('Notification', Notification);