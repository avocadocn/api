'use strict';

/**
 * 数据模型依赖项
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

/**
 * 群组数据模型
 */
var GroupInvieteCodeModel = new Schema({
  code: { // 群组邀请码
    type: String,
    unique: true
  },

  groupId: { // 群组id
    type: Schema.Types.ObjectId,
    ref: "Groups"
  },

  user: { // 邀请码生成者
    _id: Schema.Types.ObjectId,
    nickname: String,
    photo: String
  },

  status: { // 邀请码是否可用(邀请码所有者可使邀请码失效)
    type: Boolean,
    default: true
  },
  
  invalidTime: { // 邀请码自动失效时间(待用)
    type: Date
  },

  createTime: { // 邀请码产生时间
    type: Date,
    default: Date.now
  }
});

mongoose.model('GroupInviteCode', GroupInvieteCodeModel);