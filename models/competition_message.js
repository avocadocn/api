//挑战信数据结构
'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    mongoosePaginate = require('mongoose-paginate');
var CompetitionMessage = new Schema({
  sponsor_team: {   //发起方小队
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  sponsor_cid: Schema.Types.ObjectId, //发起方cid
  sponsor_unread:{    //发起方未读
    type: Boolean,
    default: false
  },
  opposite_team: {  //被挑战方小队
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  opposite_cid: Schema.Types.ObjectId,//被挑战方cid
  opposite_unread:{    //被挑战方未读
    type: Boolean,
    default: false
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
  content: String,  //挑战词
  vote: {
    type: Schema.Types.ObjectId,
    ref: 'Vote'
  }

});
CompetitionMessage.plugin(mongoosePaginate);

mongoose.model('CompetitionMessage', CompetitionMessage);