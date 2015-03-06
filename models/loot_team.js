'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var LootTeam = new Schema({
  loot_id: Schema.Types.ObjectId, // 某个具体场地争夺机会的_id，对应于模型Loot
  team: {
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },

  // 参与争夺场地的成员
  loot_members: [{
    _id: Schema.Types.ObjectId,
    photo: String,
    nickname: String,
    is_success: Boolean // 是否争取成功
  }]

});

mongoose.model('LootTeam', LootTeam);
