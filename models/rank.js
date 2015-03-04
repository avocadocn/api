'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
var _team = new Schema({
  _id: Schema.Types.ObjectId,
  cid:Schema.Types.ObjectId,
  name: String,
  logo: String,
  score: Number,
  rank: Number
});

var Rank = new Schema({
  create_date: {
    type:Date,
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
  rank_type:{
    type: String,
    enum: ['activity', 'score']
  },
  name: String,
  team: [_team]
});



mongoose.model('Rank', Rank);