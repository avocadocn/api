'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  crypto = require('crypto'),
  mongoosePaginate = require('mongoose-paginate');

var _device = new Schema({
  platform: String,
  version: String,
  device_id: String,
  device_type: String, //同一platform设备的类型(比如ios系统有iPhone和iPad)
  access_token: String, //每次登录时生成
  ios_token: String, //只有iosd的APN推送才会用到
  user_id: String, //只有Android的百度云推送才会用到
  channel_id: String, //只有Android的百度云推送才会用到
  app_id: String,
  api_key: String,
  update_date: {
    type: Date,
    default: Date.now
  }
});

var _team = new Schema({ // 群组组件
  _id: Schema.Types.ObjectId, //群组id
  leader: { //该员工是不是这个群组的队长
    type: Boolean,
    default: false
  },
  admin: { //该用户是否是这个群组的管理员
    type: Boolean,
    default: false
  },
  public: { // 是否公开
    type: Boolean,
    default: true
  }
});
/**
 * User Schema
 */
var UserSchema = new Schema({
  username: { //2.0版改为phone
    type: String,
    unique: true
  }, 
  email: {
    type: String
  },
  //HR是否关闭此人
  active: {
    type: Boolean,
    default: true
  },
  //邮件激活
  // mail_active: {
  //   type: Boolean,
  //   default: false
  // },
  invited: Boolean, // 是否是通过hr发邀请来注册的

  hashed_password: String,
  //标记是user or company, company也有对应属性
  provider: {
    type: String,
    default: 'user'
  },
  salt: String,
  //头像
  photo: {
    type: String,
    default: '/img/icons/default_user_photo.png'
  },

  nickname: String,
  realname: String,
  //todo
  department: {
    name: String,
    _id: Schema.Types.ObjectId
  },
  gender: Boolean,//0:女，1：男
  birthday: {
    type: Date
  },
  bloodType: {
    type: String,
    enum: ['AB', 'A', 'B', 'O']
  },
  //个人简介
  introduce: {
    type: String
  },
  //注册日期
  register_date: {
    type: Date,
    default: Date.now
  },
  //手机
  phone: {
    type: String,
    unique: true
  },
  qq: {
    type: String
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'Student'], //大使, 学生
    default: 'Student'
  },
  //公司_id
  cid: {
    type: Schema.Types.ObjectId,
    ref: 'Company'
  },
  cname: String, // 公司全称
  company_official_name: String, //公司简称
  team: [_team],
  //established_team: [_team], //自己创建的小队
  //本系统是否关闭此人
  disabled: {
    type: Boolean,
    default: false
  },
  device: [_device],
  push_toggle: { //免打扰开关 false为接收push
    type: Boolean,
    default: false
  },
  //todo
  score: {
    // 积分总数
    total: {
      type: Number,
      default: 0
    }
  },
  //自己写的标签
  tags: [String],
  
  // 邀请人id
  invite_person: Schema.Types.ObjectId,

  //修改个人基本资料时更新
  timeHash: {
    type: Date,
    default: Date.now
  },

  //有动态更新的时间戳
  interactionTime: {
    type: Date,
    default: Date.now
  },

  // 个人照片
  photos: [{
    uri: String,
    create_time: {
      type: Date,
      default: Date.now
    },
    //是否显示
    display: {
      type: Boolean,
      default: true
    }
  }],

  // 关注
  concern: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    createTime: {
      type: Date,
      default: Date.now
    }
  }],
  enrollment: { // 入学时间
    type: Number
  }
});

/**
 * Virtuals
 */
UserSchema.virtual('password').set(function(password) {
  this._password = password;
  this.salt = this.makeSalt();
  this.hashed_password = this.encryptPassword(password);
}).get(function() {
  return this._password;
});
UserSchema.plugin(mongoosePaginate);
/**
 * Validations
 */
var validatePresenceOf = function(value) {
  return value && value.length;
};
var filterTeam = function (teamType) {
  var _filterTeam;
  switch(teamType) {
    case 0:
      _filterTeam = function (teams) {
        var tids = [];
        teams.forEach(function (team) {
          tids.push(team._id)
        })
        return tids;
      }
      break;
    case 1:
      _filterTeam = function (teams) {
        var tids = [];
        teams.forEach(function (team) {
          if(team.public)
            tids.push(team._id)
        })
        return tids;
      }
      break;
    case 2:
      _filterTeam = function (teams) {
        var tids = [];
        teams.forEach(function (team) {
          if(!team.public)
            tids.push(team._id)
        })
        return tids;
      }
      break;
    case 3:
      _filterTeam = function (teams) {
        var tids = [];
        teams.forEach(function (team) {
          if(team.leader || team.admin)
            tids.push(team._id)
        })
        return tids;
      }
      break;
    default:
      _filterTeam = function (teams) {
        var tids = [];
        teams.forEach(function (team) {
          tids.push(team._id)
        })
        return tids;
      }
  }
  return _filterTeam;
}

/**
 * Pre-save hook
 */
/*UserSchema.pre('save', function(next) {
    if (!this.isNew) return next();

    if (!validatePresenceOf(this.password) && !this.provider)
        next(new Error('Invalid password'));
    else
        next();
});*/

/**
 * Methods
 */
UserSchema.methods = {
  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */
  authenticate: function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },

  /**
   * Make salt
   *
   * @return {String}
   * @api public
   */
  makeSalt: function() {
    return crypto.randomBytes(16).toString('base64');
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
   * @api public
   */
  encryptPassword: function(password) {
    if (!password || !this.salt) return '';
    var salt = new Buffer(this.salt, 'base64');
    return crypto.pbkdf2Sync(password, salt, 10000, 64).toString('base64');
  },

  /**
   * 是否是某个队的成员
   * @param  {Object|String}  tid
   * @return {Boolean}
   */
  isTeamMember: function(tid) {
    tid = tid.toString();
    for (var i = 0; i < this.team.length; i++) {
      if (tid === this.team[i]._id.toString()) {
        return true;
      }
    }
    return false;
  },

  isTeamLeader: function(tid) {
    tid = tid.toString();
    for (var i = 0; i < this.team.length; i++) {
      if (tid === this.team[i]._id.toString()) {
        return this.team[i].leader;
      }
    }
    return false;
  },
  isAdmin: function() {
    for (var i = 0; i < this.team.length; i++) {
      if(this.team[i].leader || this.team[i].admin)
        return true;
    }
    return false;
  },
  isTeamAdmin: function(tid) {
    tid = tid.toString();
    for (var i = 0; i < this.team.length; i++) {
      if (tid === this.team[i]._id.toString()) {
        return this.team[i].leader || this.team[i].admin;
      }
    }
    return false;
  },

  isSuperAdmin: function(cid) {
    if(!cid) return false;
    return this.role === 'SuperAdmin' && cid.toString() === this.cid.toString() ;
  },

  // isLeader: function() {
  //   for (var i = 0; i < this.team.length; i++) {
  //     if (this.team[i].leader) {
  //       return true;
  //     }
  //   }
  //   return false;
  // },

  getCid: function() {
    return this.cid;
  },
  /**
   * 获取tid
   * @param  {[type]} teamType undefined:所有，1:公开，2:私有，3:管理的小队
   * @return {[type]}          [description]
   */
  getTids: function(teamType) {
    
    var _filterTeam = filterTeam(teamType);
    return _filterTeam(this.team);
  },
  /**
   * 添加设备信息到用户的设备记录中
   * @param {Object} headers req.headers
   * @param {Object} token 生成的新token
   * @param {Object} pushData push的相关数据
   */
  addDevice: function(headers, access_token, pushData) {
    pushData = pushData || {};
    var headersKeys = ['x-app-id', 'x-api-key', 'x-device-id', 'x-device-type', 'x-platform', 'x-version'];
    var modelKeys = ['app_id', 'api_key', 'device_id', 'device_type', 'platform', 'version'];
    var device = {};
    for (var i = 0; i < headersKeys.length; i++) {
      var headersKey = headersKeys[i];
      var modelKey = modelKeys[i];
      if (headers[headersKey]) {
        device[modelKey] = headers[headersKey];
      } else {
        device[modelKey] = null;
      }
    }
    device.access_token = access_token;
    // if ('Android iOS WindowsPhone BlackBerry'.indexOf(device.platform) === -1) {
    //     return;
    // }
    if (device.platform == 'iOS' && pushData.ios_token) {
      device.ios_token = pushData.ios_token;
    } else if (device.platform == 'Android' && pushData.user_id && pushData.channel_id) {
      device.user_id = pushData.user_id;
      device.channel_id = pushData.channel_id;
    }
    if (!this.device) {
      this.device = [];
    }
    for (var i = 0; i < this.device.length; i++) {
      var historyDevice = this.device[i];
      if (historyDevice.platform === device.platform) {
        this.device.splice(i, 1);
        break;
      }
    }
    this.device.push(device);
  },

  /**
   * 更新某个设备的token
   * @param  {String} oldToken 旧的token
   * @param  {String} newToken 新的token
   * @return {Boolean} 如果有找到匹配的token，则返回true，否则返回false
   */
  updateDeviceToken: function (oldToken, newToken) {
    for (var i = 0, deviceLen = this.device.length; i < deviceLen; i++) {
      var device = this.device[i];
      if (device.access_token === oldToken) {
        device.access_token = newToken;
        return true;
      }
    }
    return false;
  },

  /**
   * 移除用户的设备记录中的设备信息
   * @param  {[type]} headers [description]
   * @return {[type]}         [description]
   */
  removeDevice: function(headers) {
    var headersKeys = ['x-device-id', 'x-device-type', 'x-platform', 'x-version'];
    var modelKeys = ['device_id', 'device_type', 'platform', 'version'];
    var device = {};
    for (var i = 0; i < headersKeys.length; i++) {
      var headersKey = headersKeys[i];
      var modelKey = modelKeys[i];
      if (headers[headersKey]) {
        device[modelKey] = headers[headersKey];
      } else {
        device[modelKey] = null;
      }
    }
    if (!this.device) {
      this.device = [];
    }
    for (var i = 0; i < this.device.length; i++) {
      var historyDevice = this.device[i];
      if (historyDevice.platform === device.platform && historyDevice.device_id === device.device_id) {
        this.device.splice(i, 1);
        break;
      }
    }
  }
};

mongoose.model('User', UserSchema);