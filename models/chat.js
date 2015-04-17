//聊天数据结构

'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Chat = new Schema({
  chatroom_id: Schema.Types.ObjectId,  //聊天室的id,这个主体可以是 一个小队、一个公司
  chat_type:{
    type: Number,
    enum:[1,2,3,4,5,6,7],//1:'normal',2:'recommend_team',3:'send_competition',4:'receive_competition',5:'accept_competition',6:'accepted_competition',7:比分确认
    default: 1
  },
  competition_type: Number,     //类型，1为挑战，2为联谊 与competition_message相同
  opponent_team:{ //对方小队->推荐小队、挑战相关的小队.
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  competition_message:{
    type: Schema.Types.ObjectId,
    ref: 'CompetitionMessage'
  },
  campaign:{
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  content: String,
  create_date:{
    type:Date,
    default: Date.now
  },
  //发聊天者id
  poster:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  poster_team:{
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  status:{
    type: String,
    enum:['active','delete','shield'],
    default: 'active'
  },
  
  photos: [{
    uri: String,
    width: Number,
    height: Number,
    ori_uri: String
  }]
});


mongoose.model('Chat', Chat);