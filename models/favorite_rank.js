'use strict';

/**
 * 数据模型依赖项
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * 榜单数据模型
 */
var FavoriteRankModel = new Schema({
  cid: { // 公司id
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },

  // cname: String, // 公司名称

  userId: { // 用户id
    type: Schema.Types.ObjectId,
    required: true
  },

  photo: String, // 用户头像

  vote: { // 票数
    type: Number,
    default: 0
  },

  type: { // 榜单种类
    type: Number,
    enum:[1, 2, 3], //1男神榜 2女神榜 3人气榜
    required: true
  },

  phase: { // 期数(暂考虑使用期数, 不使用时间, 同时该属性待用)
    type: Number,
    required: true
  }

});

mongoose.model('FavoriteRank', FavoriteRankModel);