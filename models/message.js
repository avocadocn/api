//Donler 定制版站内信

'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Message = new Schema({
  rec_id: Schema.Types.ObjectId,  // 接收者_id
  MessageContent: {
    type:Schema.Types.ObjectId,  // Model.MessageContent._id
    ref:"MessageContent"
  },
  //总体的类型
  type: {
    type: String,
    enum: ['private', 'team', 'department', 'company','global']
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'delete', 'sender_delete']
  },
  create_date:{
    type:Date,
    default:Date.now
  },

  /**
   * 更加细致的类型分类
   * 0 系统消息
   * 1 公司消息
   * 2 小队消息(结合sender来判断是公司发的还是小队发的)
   * 3 活动或者比赛消息(child_type=0为活动  child_type=1为比赛   结合sender来判断是公司发的还是小队发的)
   * 4 和挑战相关的消息(child_type=0为发起挑战  child_type=1为接受挑战   child_type=2为拒绝挑战  child_type=3为取消挑战)
   * 5 和比赛确认相关的消息(child_type=0对方发起新的比赛确认(或者对之前的比分发出异议)  child_type=1对方接受比分确认)
   * 6 推荐活动(通常由个人发给队长)
   * 7 队长间的私信
   */
  specific_type:{
    value: Number,
    child_type: Number
  }
});

mongoose.model('Message', Message);