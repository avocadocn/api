//挑战信数据结构
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CompetitionMessage = new Schema({
  //要不要cid...???
  sponsor_team: {   //发起方
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  opposite_team: {  //被挑战方
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  competition_type: Number,     //类型，1为挑战，2为联谊
  create_time: {    //创建时间
    type: Date,
    default: Date.now
  },
  deal_time: {      //处理时间
    type: Date
  },
  status: {
    type: String,
    //分别为：已发送请求(未被处理),接受未发活动,被拒绝,已生成挑战
    enum: ['sent', 'accepted', 'rejected', 'competing'],
    default: 'sent'
  },
  campaign: {       //发成功后的campaign的_id
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  content: String   //挑战词

});


mongoose.model('CompetitionMessage', CompetitionMessage);