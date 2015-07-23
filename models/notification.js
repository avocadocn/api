'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

//通知
var Notification = new Schema({
  //通知类型 1: 互动 2: 通知(礼物、入群、系统)
  noticeType: {
    type: Number,
    enum: [1,2],
    required: true
  },
  //互动(包括评论)才有的属性 1: 活动 2: 投票 3: 求助
  interactionType: {
    type: Number,
    enum:[1,2,3]
  },

  //非系统通知 以下三者选其一
  //Interaction的id
  interaction: {
    type: Schema.Types.ObjectId,
    ref: 'Interaction'
  },
  //礼物的id
  gift: {
    type: Schema.Types.ObjectId,
    ref: 'Gift'
  },
  //小队的id
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team'
  },

  //- 互动：
  //互动的动作
  //  1: 活动有人参加了、投票有人参与了、求助有人回答了
  //  2: 被邀请参加活动、投票、求助
  //  3: 求助被采纳了
  //  4: 评论有回复
  //  5: 评论被赞了
  //  6: 被邀请进小队
  //  7: 入群申请被通过
  //  8: XX申请入X群，待处理(群主)
  //  9: 活动被关闭了
  //送礼及系统无此属性
  action: {
    type: Number,
    enum: [1,2,3,4,5,6,7,8,9]
  },
  //提醒中要显示的内容
  //活动、投票、求助的主题名, 若是评论则为他评论的内容，若是群则为群名
  content: String,
  //若是自己的评论有回复了则有此属性(action为4、5),此为新回复的id
  reply: Schema.Types.ObjectId,
  //若是赞，保存被赞的评论id(action为5)
  replyTo: Schema.Types.ObjectId,
  
  //可能很多人回答、参加 (action为1、5、8)
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