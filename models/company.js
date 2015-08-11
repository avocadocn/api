'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    crypto = require('crypto'),
    mongoosePaginate = require('mongoose-paginate');

//小队信息
var _team = new Schema({
    _id: { // 群组id
        type: Schema.Types.ObjectId
    }
});

// var _department = new Schema({
//     level:Number,
//     parent_id:Schema.Types.ObjectId,
//     name: String,
//     department: [_department]
// });

/**
 * Company Schema
 */
var CompanySchema = new Schema({

    //是否激活
    status: {
        active: {//是否被后台屏蔽，屏蔽了为false
            type: Boolean,
            default: false
        },
        verification: {//暂时只能0、1。 0表示过了系统审核,1表示未审核（快速注册）,未来可以增加各种审核
            type: Number,
            default: 0,
            enum: [0,1]
        },

        date: Date //?
    },

    team:[_team], // 小队

    //department: [_department], //未来可以加学院等
    //公司信息
    info: {
        name: String,               //公司全称
        city: {
            province: String,
            city: String,
            district: String
        },
        address: String,

        brief: String,
        official_name: String,        //公司官方用户名（简称）

        logo:{
            type:String,
            default: '/img/icons/default_company_logo.png'
        },

        membernumber: {
            type: Number,
            default: 0
        },
        cover:{ //封面
            type:String,
            default: '/img/company_cover.png'
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

    // 企业给用户的邀请码
    invite_key: String,
    guide_step:{
        type: Number,
        default: 0
    },
    //管理员
    super_admin: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }]
});

CompanySchema.plugin(mongoosePaginate);
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


/**
 * Pre-save hook
 */
CompanySchema.pre('save', function(next) {
    if (!this.isNew) return next();
    else
        next();
});

/**
 * Methods
 */
CompanySchema.methods = {

    getCid: function () {
        return this._id;
    }

};


mongoose.model('Company', CompanySchema);
