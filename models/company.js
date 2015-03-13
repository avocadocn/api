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
    app_id: String,
    api_key: String,
    update_date:{
        type: Date,
        default: Date.now
    }
});
//小队信息
var _team = new Schema({
    gid : String,
    group_type: String,
    name: String,
    id: {
        type: Schema.Types.ObjectId
    },
    //0：官方小队
    //1：个人小队
    group_level: Number
});

var _department = new Schema({
    level:Number,
    parent_id:Schema.Types.ObjectId,
    name: String,
    department: [_department]
});

/**
 * Company Schema
 */
var CompanySchema = new Schema({

    username: String,               //用户名，登录用

    login_email: {
        type: String,
        unique: true
    },
    hashed_password: String,

    email: {
        domain: Array               //邮箱后缀(多个)
    },

    department:[_department],
    //是否激活
    status: {
        mail_active:{//邮箱激活
            type: Boolean,
            default: false
        },
        active: {//是否被后台屏蔽，屏蔽了为false
            type: Boolean,
            default: false
        },

        date: Number
    },

    team:[_team],
    //公司信息
    info: {
        name: String,               //公司全称
        city: {
            province: String,
            city: String,
            district: String
        },
        address: String,
        phone: String,

        //固话
        lindline: {
            areacode: String,         //区号
            number: String,           //号码
            extension: String         //分机
        },
        linkman: String,              //联系人
        email: String,
        brief: String,
        official_name: String,        //公司官方用户名（简称）

        logo:{
            type:String,
            default: '/img/icons/default_company_logo.png'
        },

        membernumber: {
            type: Number,
            default: 0
        }
    },
    register_date: {
        type: Date,
        default: Date.now
    },
    provider: {
        type: String,
        default: 'company'
    },
    salt: String,
    // 企业注册用的邀请码
    register_invite_code: [String],
    // 企业给用户的邀请码
    invite_key: String,
    device: [_device]
});

/**
 * Virtuals
 */
CompanySchema.virtual('password').set(function(password) {
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

// The 4 validations below only apply if you are signing up traditionally.
CompanySchema.path('info.name').validate(function(name) {
    // If you are authenticating by any of the oauth strategies, don't validate.
    if (!this.provider) return true;
    return (typeof name === 'string' && name.length > 0);
}, 'Name cannot be blank');


CompanySchema.path('username').validate(function(username) {
    // If you are authenticating by any of the oauth strategies, don't validate.
    if (!this.provider) return true;
    return (typeof username === 'string' && username.length > 0);
}, 'Username cannot be blank');

CompanySchema.path('hashed_password').validate(function(hashed_password) {
    // If you are authenticating by any of the oauth strategies, don't validate.
    if (!this.provider) return true;
    return (typeof hashed_password === 'string' && hashed_password.length > 0);
}, 'Password cannot be blank');


/**
 * Pre-save hook
 */
CompanySchema.pre('save', function(next) {
    if (!this.isNew) return next();

    if (!validatePresenceOf(this.password) && !this.provider)
        next(new Error('Invalid password'));
    else
        next();
});

/**
 * Methods
 */
CompanySchema.methods = {
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

    getCid: function () {
        return this._id;
    },
    /**
     * 添加设备信息到用户的设备记录中
     * @param {Object} headers req.headers
     * @param {Object} token 生成的新token
     */
    addDevice: function (headers, access_token) {
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

CompanySchema.statics.eptPass = function(password) {
    return this.encryptPassword(password);
};

mongoose.model('Company', CompanySchema);
