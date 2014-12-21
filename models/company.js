'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto');


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
    app_token: String, // 保存上次登录的token，如果注销则清除。
    token_device: {
        platform: String,
        version: String,
        device_id: String,
        device_type: String,
        app_id: String,
        api_key: String
    } // 上次登录的设备信息，如果注销则清除。
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
    }
};

CompanySchema.statics.eptPass = function(password) {
    return this.encryptPassword(password);
};

mongoose.model('Company', CompanySchema);
