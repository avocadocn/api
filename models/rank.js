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
  year: Number,
  month:Number,
  name: String,
  team: [_team]
});



mongoose.model('Rank', Rank);