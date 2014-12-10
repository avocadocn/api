'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;
  // mongoosePaginate = require('mongoose-paginate');

/**
 * 用于子文档嵌套
 */
var _member = {
  // camp: {                //阵营
  //   type: String,
  //   enum: ['A', 'B']
  // },
  // cid: String,
  _id: Schema.Types.ObjectId,
  nickname: String,
  photo: String
  // team: {
  //   _id: Schema.Types.ObjectId,
  //   name: String,
  //   logo: String
  // }
};

//旧数据，不用了
//阵形图子文档
// var _formation = new Schema({
//   uid: String,
//   x: Number,
//   y: Number
// });
// //阵营
// var _camp = new Schema({
//   id: Schema.Types.ObjectId,               //小队id
//   logo: String,                            //队徽路径
//   tname: String,
//   member: [_member],
//   member_quit: [_member],
//   cid: String,
//   gid: String,
//   start_confirm: {                         //双方组长都确认后才能开战
//     type: Boolean,
//     default: false
//   },
//   formation: [_formation],
//   result: {                                //比赛结果确认
//     confirm: {
//       type: Boolean,
//       default: false
//     },
//     content: String,
//     start_date: Date
//   },
//   score: Number,
//   vote: {
//     positive: {                             //赞成员工投票数
//       type: Number,
//       default: 0
//     },
//     positive_member: [_member],             //赞成员工id,cid
//     negative: {                             //反对员工投票数
//       type: Number,
//       default: 0
//     },
//     negative_member: [_member]              //反对员工id,cid
//   }
// });

//新阵营
var _campaignUnit={
  company:{
    _id:Schema.Types.ObjectId,
    name:String,
    logo:String
  },
  team:{
    _id:Schema.Types.ObjectId,
    name:String,
    logo:String
  },
  member:[_member],
  member_quit: [_member],
  //投票不要了
  // vote:{
  //   positive: {                             //赞成员工投票数
  //     type: Number,
  //     default: 0
  //   },
  //   positive_member: [_member],             //赞成员工id
  //   negative: {                             //反对员工投票数
  //     type: Number,
  //     default: 0
  //   },
  //   negative_member: [_member]              //反对员工id
  // },
  start_confirm: {                         //双方组长都确认后才能开战
    type: Boolean,
    default: false
  }
};
/**
 * 活动
 */
var Campaign = new Schema({
  tid: [Schema.Types.ObjectId],     //参加该活动的所有组
  cid: [Schema.Types.ObjectId],     //参加该活动的所有公司
  campaign_unit:[_campaignUnit],     //新阵营
  active: {
    type: Boolean,
    default: false
  },
  confirm_status: {
    type: Boolean,
    default: true
  },
  finish: {
    type: Boolean,
    default: false
  },
  
  // cname: Array,                     //旧数据
  poster: {
    cid: String,                       //活动发起者所属的公司
    cname: String,
    tname: String,
    uid: String,
    nickname: String,
    role: {
      type: String,
      enum: ['HR', 'LEADER']
    }
  },
  theme: {//主题
    type: String,
    required: true
  },
  content: {//简介
    type: String
  },
  member_min: {//最少人数
    type: Number,
    default: 0
  },
  member_max: {//人数上限
    type: Number,
    default: 0
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [],
    name: String
  },
  start_time: Date,
  end_time: Date,
  deadline: Date,
  photo_album: {
    type: Schema.Types.ObjectId,
    ref: 'PhotoAlbum'
  },
  // member: [_member],              //旧数据
  // member_quit: [_member],         //旧数据
  create_time: {
    type: Date,
    default: Date.now
  },
  // camp: [_camp],                   //阵营 旧数据
  comment_sum: {
    type: Number,
    default: 0
  },
  //总分类: 1,2,3,6,8是活动  4,5,7,9是挑战
  //type:活动类型
  //1:公司活动
  //2:小队活动
  //3:公司内跨组活动（性质和小队活动一样,只是参加活动的小队不止一个而已,这些小队都是一个公司的）
  //4:公司内挑战（同类型小组）
  //5:公司外挑战（同类型小组）
  //6:部门内活动 (一个部门的活动)
  //7:动一下 (一个小队向另一个小队发起挑战,这两个小队不分类型也不分公司)
  //8:部门间活动 (公司的两个部门一起搞活动)
  //9:部门间相互挑战
  campaign_type: Number,

  //活动类型,篮球等
  campaign_mold: String,
  tags: [String],

  //活动组件
  components: [
    {
      name: String,
      _id: Schema.Types.ObjectId
    }
  ],

  // 是否使用组件, 这是为了兼容旧的数据, 旧的活动没有此属性, 进入活动页面时将会为该活动创建评论组件并将此属性的值设为true
  modularization: Boolean,

  //评论过的人(已参加、未参加的都可能在这儿)
  commentMembers: [_member], 

  //最新评论
  latestComment: {
    _id: Schema.Types.ObjectId,
    poster:_member,
    content: String,
    createDate:{
      type:Date,
      default: Date.now
    }
  }
});

Campaign.virtual('members').get(function () {
  var members = [];
  this.campaign_unit.forEach(function (unit) {
    members = members.concat(unit.member);
  });
  return members;
});

Campaign.virtual('isProvoke').get(function () {
  
  return [4,5,7,9].indexOf(this.campaign_type)>-1;
});
// Campaign.plugin(mongoosePaginate);

Campaign.methods = {

  /**
   * 判断用户参加了哪个阵营的活动
   * @param {Object|String} uid 用户id，ObjectId和String均可
   * @returns {Object|Boolean} 返回用户所在的阵营对象，如果没有，返回false
   */
  whichUnit: function (uid) {
    uid = uid.toString();
    for (var i = 0; i < this.campaign_unit.length; i++) {
      var unit = this.campaign_unit[i];

      for (var j = 0; j < unit.member.length; j++) {
        if (uid === unit.member[j]._id.toString()) {
          return unit;
        }
      }

    }
    return false;
  },

  /**
   * 参加活动，已参加、活动报名截止会导致失败
   * example:
   *  campaign.join({
   *    cid: company._id,
   *    tid: team._id
   *  }, req.user);
   * @param {Object} targetUnit 参加的阵营的基本信息，包括cid,tid(tid没有可省略)
   * @param {Object} user req.user
   * @returns {Object} 参加结果对象，包括result, msg两个属性
   *  return: {
   *    success: Boolean, // 成功为true, 失败为false
   *    msg: String // 失败后的消息
   *  }
   */
  join: function (targetUnit, user) {

    if (this.deadline < Date.now()) {
      return {
        success: false,
        msg: '活动报名已经截止'
      };
    }

    if (this.member_max > 0) {
      if (this.members.length >= this.member_max) {
        return {
          success: false,
          msg: '报名人数已达上限'
        };
      }
    }

    for (var i = 0; i < this.campaign_unit.length; i++) {
      var unit = this.campaign_unit[i];

      var _join = function (unit) {
        for (var i = 0; i < unit.member.length; i++) {
          if (user._id.toString() === unit.member[i]._id.toString()) {
            // 用户已经参加该活动
            return {
              success: false,
              msg: '您已经参加该活动'
            };
          }
        }

        for (var i = 0; i < unit.member_quit.length; i++) {
          if (user._id.toString() === unit.member_quit[i]._id.toString()) {
            var member = (unit.member_quit.splice(i, 1))[0];
            unit.member.push(member);
            return {
              success: true
            };
          }
        }

        // 用户没有参加
        unit.member.push({
          _id: user._id,
          nickname: user.nickname,
          photo: user.photo
        });
        return {
          success: true
        };
      };
      // 非公司活动
      if (targetUnit.tid) {
        if(targetUnit.tid.toString() === unit.team._id.toString()){
          return _join(unit);
        }
      }
      // 公司活动
      else if (targetUnit.cid && targetUnit.cid.toString() === unit.company._id.toString()) {
        return _join(unit);
      }

    }
    return {
      success: false,
      msg: '没有找到目标阵营'
    };
  },

  /**
   * 退出活动
   * @param {Object} uid
   * @returns {boolean} 成功返回true，失败返回false
   */
  quit: function (uid) {

    if (this.end_time < Date.now()) {
      return false;
    }

    uid = uid.toString();
    var _quit = function (unit) {
      for (var i = 0; i < unit.member.length; i++) {
        if (uid === unit.member[i]._id.toString()) {
          var member = (unit.member.splice(i, 1))[0];
          if (!unit.member_quit) {
            unit.member_quit = [];
          }
          unit.member_quit.push(member);
          return true;
        }
      }
      return false;
    };

    for (var i = 0; i < this.campaign_unit.length; i++) {
      var unit = this.campaign_unit[i];
      if (_quit(unit)) {
        return true;
      }
    }
    return false;
  },

  /**
   * 整理活动组件
   * @return {Object} 活动组件对象
   *  return: {
   *    componentName: [mongoose.Schema.Types.ObjectId]
   *  }
   */
  formatComponents: function () {
    var result = {};
    this.components.forEach(function (component) {
      if (!result[component.name]) {
        result[component.name] = [];
      }
      result[component.name].push(component._id);
    });
    return result;
  }

};


mongoose.model('Campaign', Campaign);