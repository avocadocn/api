'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var Loot = new Schema({
  stadium: {
    type: Schema.Types.ObjectId,
    ref: 'Stadium'
  },
  site: String,               //哪个场地，如：n号场/n号包厢
  content: String,            //描述
  group_type: String,         //同小队group_type
  campaign_start_time: Date,  //这个场地的活动开始时间
  campaign_end_time: Date,    //这个场地的活动结束时间
  loot_start_time: Date,      //抢购开始时间
  loot_end_time: Date,        //抢购结束时间
  term: {                     //属于哪一期
    type: Schema.Types.ObjectId,
    ref: 'Term'
  },
  loot_number: Number,        //几个人抢到算数
  status: {
    type: String,
    //可抢、被抢了、被关了、结束了没人抢到
    enum: ['active', 'looted', 'closed', 'unlooted'],
    default: 'active'
  },
  looted_team: {  //哪个队抢到的
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  }

});

mongoose.model('Loot', Loot);