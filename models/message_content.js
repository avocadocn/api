'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;




var _sender = new Schema({
  _id:Schema.Types.ObjectId,
  nickname:String,
  photo:String,
  role:{
    type:String,
    enum:['USER','LEADER','HR']
  }
});

var _team = new Schema({
  _id : Schema.Types.ObjectId,
  name : String,
  logo : String,
  status: {
    type: Number,
    enum: [0,1,2,3,4,5]              //如果(campaign_id 存在){0:活动  1:比赛} 否则 {0:发起挑战 1:接受挑战 2:发起新的比赛确认 3:接受比赛确认 4:拒绝挑战 5:取消挑战}
  }
});
/**
 * type=private时，对应 Message 里的 private team department 三种情况
 */
var MessageContent = new Schema({
  caption: String,
  content: String,
  sender: [_sender],
  team: [_team],  // 消息所属小队
  company_id: Schema.Types.ObjectId,  // 消息所属公司的_id
  campaign_id: Schema.Types.ObjectId,
  groupmessage_id: Schema.Types.ObjectId,//这tm存它干嘛的...-M
  department_id: Schema.Types.ObjectId,
  auto: {
    type:Boolean,
    default:false
  },
  status:{
    type:String,
    enum: ['delete','undelete'],
    default:'undelete'
  },
  type: {
    type: String,
    enum: ['private','company','global']
  },
  post_date: {
    type: Date,
    default: Date.now
  },
  deadline:{
    type: Date,
    default: Date.now
  },
  //更加细致的类型分类
  specific_type:{
    value: Number,
    child_type: Number
  }
});

//specific_type
//0 系统消息
//1 公司消息
//2 小队消息(结合sender来判断是公司发的还是小队发的)
//3 活动或者比赛消息(child_type=0为活动  child_type=1为比赛   结合sender来判断是公司发的还是小队发的)
//4 和挑战相关的消息(child_type=0为发起挑战  child_type=1为接受挑战   child_type=2为拒绝挑战  child_type=3为取消挑战)
//5 和比赛确认相关的消息(child_type=0对方发起新的比赛确认(或者对之前的比分发出异议)  child_type=1对方接受比分确认)
//6 推荐活动(通常由个人发给队长)

mongoose.model('MessageContent', MessageContent);

