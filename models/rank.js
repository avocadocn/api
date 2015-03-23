'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var _team = new Schema({
  _id: {
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  cid:{
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  cname: String,
  name: String,
  logo: String,
  activity_score: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  rank: Number,
  win: {
    type: Number,
    default: 0
  },
  tie: {
    type: Number,
    default: 0
  },
  lose: {
    type: Number,
    default: 0
  },
  member_num: {
    type: Number,
    default: 0
  }
});

var Rank = new Schema({
  create_date: {
    type: Date,
    default: Date.now
  },
  city: {
    province: String,
    city: String
  },
  group_type:{
    _id:String,
    name:String
  },
  name: String,
  team: [_team]
});



mongoose.model('Rank', Rank);