//聊天数据结构

'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Chat = new Schema({
  chatroom_id: Schema.Types.ObjectId,  //聊天室的id,这个主体可以是 一个小队、一个公司
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