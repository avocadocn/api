//投票数据结构
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var unit = {
  tid:Schema.Types.ObjectId,  //小队id
  positive: {                 //赞成人数
    type: Number,
    default: 0
  },
  positive_member: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]  //赞成者
};

var Vote = new Schema({

  host_id: Schema.Types.ObjectId, //主体id,如挑战信等
  host_type: {                    //主体类型
    type: String,
    enum: ['competition'],
    default: 'competition'
  },
  units: [unit]

});


mongoose.model('Vote', Vote);