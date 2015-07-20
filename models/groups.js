'use strict';

/**
 * 数据模型依赖项
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
/**
 * 数据模型依赖组件
 */
var _member = new Schema({ // 群组成员组件
  _id: { // 成员id
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  nickname: String, // 成员昵称
  photo: String, // 成员头像
  time: { //加入时间、申请时间
    type: Date,
    default: Date.now
  }
});

/**
 * 群组数据模型
 */
var GroupModel = new Schema({
  cid: { // 公司id
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  cname: String, // 公司名称

  name: String, // 群组名称

  logo: String, // 群组封面

  themeColor: String, // 群组主题颜色
  brief: String, // 群组简介
  open: { // 群组是否公开(全公司可见)
    type: Boolean,
    default: false
  },
  validate: { // 群组是否需要验证
    type: Boolean,
    default: false
  },

  member: [_member], // 群组成员

  leader: { // 群组管理人员（队长）
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    nickname: String,
    photo: String
  },
  // app外邀请，链接网址邀请(TODO:加入邀请人部分信息 (待考虑))
  // inviteCode: [{ // 邀请码
  //   type: String,
  //   _id: Schema.Types.ObjectId, // 邀请人id
  //   time: {
  //     type: Date,
  //     default: Date.now
  //   }
  // }],
  // app内邀请(TODO:加入邀请人部分信息 (待考虑))
  inviteMember: [{ // 被邀请成员
    inviteMemberId: Schema.Types.ObjectId, //被邀请人id
    _id: Schema.Types.ObjectId, //邀请人id
    time: { // 邀请时间
      type: Date,
      default: Date.now
    }
  }],

  applyMember: [_member], // 申请加入该群组的人(group_type.validate === true)

  photoAlbumList: [{ // 相册(待用)
    type: Schema.Types.ObjectId,
    ref: 'PhotoAlbum'
  }],

  active: { // 小队是否删除(true: 未删除， false: 删除)
    type: Boolean,
    default: true
  },

  // 小队所属公司是否关闭(待用)
  companyActive: {
    type: Boolean,
    default: true
  },

  createTime: { // 群组建立时间
    type: Date,
    default: Date.now
  }
});

/**
 * 群组方法
 */
GroupModel.methods = {
  // 群组所有成员id
  memberIds: function() {
    return this.member.map(function(obj) { return obj._id});
  }
};

mongoose.model('Groups', GroupModel);