'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto');

var _device = new Schema({
    platform:String,
    version:String,
    device_id:String,
    device_type:String,            //同一platform设备的类型(比如ios系统有iPhone和iPad)
    access_token:String,           //每次登录时生成
    ios_token:String,              //只有iosd的APN推送才会用到
    user_id:String,                //只有Android的百度云推送才会用到
    channel_id:String,             //只有Android的百度云推送才会用到
    app_id: String,
    api_key: String,
    update_date:{
        type: Date,
        default: Date.now
    }
});

var _team = new Schema({
    gid: {
        type: String,
        ref: 'Group'
    },
    _id: Schema.Types.ObjectId,
    group_type: String,
    entity_type: String,           //对应的增强组件名字
    name : String,
    leader : {                    //该员工是不是这个小队的队长
        type : Boolean,
        default : false
    },
    logo: String
});

var latestCommentCampaign = new Schema({
    _id: Schema.Types.ObjectId,
    unread: {
        type: Number,
        default: 0
    }
});
/**
 * User Schema
 */
var UserSchema = new Schema({
    username: {
        type: String,
        unique: true
    },//登录用的用户名=email
    email: {
        type: String,
        unique: true
    },
    //HR是否关闭此人
    active: {
        type: Boolean,
        default: false
    },
    //邮件激活
    mail_active:{
        type: Boolean,
        default: false
    },
    //已不需要
    //是否填了公司验证码
    // invite_active:{
    //     type:Boolean,
    //     default: true
    // },
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
    department: {
        name : String,
        _id : Schema.Types.ObjectId
    },
    position: String,//职位？已不用
    sex: {
        type: String,
        enum: ['男', '女']
    },
    birthday: {
        type: Date
    },
    bloodType: {
        type: String,
        enum: ['AB', 'A', 'B', 'O' ]
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
        type: String
    },
    qq: {
        type: String
    },
    role: {
        type: String,
        enum: ['LEADER','EMPLOYEE']      //队长 普通员工
    },
    //公司_id
    cid: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },
    cname: String,// 公司全称
    company_official_name: String,//公司简称
    team: [_team],
    established_team: [_team],           //自己创建的小队
    //本系统是否关闭此人
    disabled:{
        type: Boolean,
        default: false
    },
    device:[_device],
    push_toggle:{                   //免打扰开关 false为接收push
        type:Boolean,
        default:false
    },
    //暂时不用,顶置campaign
    top_campaign:{
        type: Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    last_comment_time: Date,//个人首页需要用的
    commentCampaigns: [latestCommentCampaign],//参加了的讨论列表
    unjoinedCommentCampaigns: [latestCommentCampaign], //未参加的讨论列表
    score: {
        // 积分总数
        total: {
            type: Number,
            default: 0
        },

        // 参加的官方小队活动成功结束
        officialCampaignSucceded: {
            type: Number,
            default: 0
        },

        // 参加官方小队
        joinOfficialTeam: {
            type: Number,
            default: 0
        },

        // 退出官方小队
        quitOfficialTeam: {
            type: Number,
            default: 0
        },

        // 上传照片到官方小队相册
        uploadPhotoToOfficialTeam: {
            type: Number,
            default: 0
        }
    },
    //自己写的标签
    tags: [String],
    //参加过多少campaign
    campaignCount:Number
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

/**
 * Validations
 */
var validatePresenceOf = function(value) {
    return value && value.length;
};


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
    isTeamMember: function (tid) {
        tid = tid.toString();
        for (var i = 0; i < this.team.length; i++) {
            if (tid === this.team[i]._id.toString()) {
                return true;
            }
        }
        return false;
    },

    isTeamLeader: function (tid) {
        tid = tid.toString();
        for (var i = 0; i < this.team.length; i++) {
            if (tid === this.team[i]._id.toString()) {
                return this.team[i].leader;
            }
        }
        return false;
    },

    isLeader: function () {
        for (var i = 0; i < this.team.length; i++) {
            if (this.team[i].leader) {
                return true;
            }
        }
        return false;
    },

    getCid: function () {
        return this.cid;
    },

    /**
     * 添加设备信息到用户的设备记录中
     * @param {Object} headers req.headers
     * @param {Object} token 生成的新token
     * @param {Object} pushData push的相关数据
     */
    addDevice: function (headers, access_token, pushData) {
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
        if(device.platform=='iOS' && pushData.ios_token){
            device.ios_token = pushData.ios_token;
        }
        else if(device.platform=='Android' && pushData.user_id&&pushData.channel_id){
            device.user_id = pushData.user_id;
            device.channel_id = pushData.channel_id;
        }
        if (!this.device) {
            this.device = [];
        }
        for (var i = 0; i < this.device.length; i++) {
            var historyDevice = this.device[i];
            if (historyDevice.platform === device.platform) {
                this.device.splice(i,1);
                break;
            }
        }
        this.device.push(device);
    },
    /**
     * 移除用户的设备记录中的设备信息
     * @param  {[type]} headers [description]
     * @return {[type]}         [description]
     */
    removeDevice:function(headers) {
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
                this.device.splice(i,1);
                break;
            }
        }
    }
};

mongoose.model('User', UserSchema);