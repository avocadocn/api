'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    mongoosePaginate = require('mongoose-paginate');



var _member = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    nickname: String,
    photo: String,
    join_time:{
        type: Date,
        default: Date.now
    }
});

var familyPhoto = new Schema({
    uri: String,
    remark: String,
    upload_user: {
        _id: Schema.Types.ObjectId,
        name: String,
        photo: String
    },
    upload_date: {
        type: Date,
        default: Date.now
    },
    hidden: {
        type: Boolean,
        default: false
    },
    select: {
        type: Boolean,
        default: true
    }
});

var _home_court = new Schema({
    loc:{
        type: {
            type:String,
            default: 'Point'
        },
        coordinates: []
    },
    name: String
});

/**
 * 企业组件
 */
var CompanyGroup = new Schema({
    cid: {
        type: Schema.Types.ObjectId,
        ref: 'Company'
    },
    gid: {
        type: String,
        ref: 'Group'
    },
    //仅个人小队有该属性
    level:Number,
    poster:{
        role: {
            type: String,
            enum: ['HR', 'Personal']
        },
        _id: {
            type: Schema.Types.ObjectId, //只有个人小队的时候才有个人id
            ref: 'User'
        }
    },
    // 如果是部门的小队，则为部门id，否则为false。
    // 如果为null或undefined，则需要查询部门，来确定是否是部门的小队。
    department: Schema.Types.Mixed,
    group_type: String,
    cname: String,
    name: String,
    member: [_member],
    leader: [_member],
    logo: {
        type: String,
        default: '/img/icons/default_group_logo.png'
    },
    entity_type: String,
    brief: String,
    //每日更新
    score: {
        campaign:{
            type: Number,
            default: 0
        },
        member:{
            type: Number,
            default: 0
        },
        participator:{
            type: Number,
            default: 0
        },
        comment:{
            type: Number,
            default: 0
        },
        album:{
            type: Number,
            default: 0
        },
        provoke:{
            type: Number,
            default: 0
        },
        //活跃度积分
        total:{
            type: Number,
            default: 0
        },
    },
    photo_album_list: [{
        type: Schema.Types.ObjectId,
        ref: 'PhotoAlbum'
    }],
    arena_id: Schema.Types.ObjectId,
    active: {
        type: Boolean,
        default: true
    },
    // 小队所属公司是否关闭(true: 未关闭; false: 关闭)
    company_active: { 
        type: Boolean,
        default: true
    },
    home_court: [_home_court],       //主场(可能有多个)
    city: {//暂时是公司的city,将来若是填了主场，公司改变city时，小队不改变
        province: String,
        city: String,
        district: String
    },
    create_time:{
        type: Date,
        default: Date.now
    },
    //每日
    count:{
        current_week_campaign: {
            type: Number,
            default: 0
        },
        current_week_member: {
            type: Number,
            default: 0
        },
        last_week_campaign: {
            type: Number,
            default: 0
        },
        last_week_member: {
            type: Number,
            default: 0
        },
        last_month_campaign: {
            type: Number,
            default: 0
        },
        last_month_member: {
            type: Number,
            default: 0
        },
        total_campaign: {
            type: Number,
            default: 0
        }
    },
    family: [familyPhoto],
    last_campaign: {
        _id: Schema.Types.Object,
        theme: String,
        start_time: Date
    },
    score_rank:{
        //实时更新
        //战绩积分
        score:{
            type: Number,
            default: 0
        },
        //一周统计
        //战绩排名
        rank:{
            type: Number,
            default: 0
        },
        win:{
            type: Number,
            default: 0
        },
        tie:{
            type: Number,
            default: 0
        },
        lose:{
            type: Number,
            default: 0
        }
    },
    timeHash: {
        type: Date,
        default: Date.now
    }
});

CompanyGroup.plugin(mongoosePaginate);
/**
 * Virtuals
 */
CompanyGroup.virtual('groupType').set(function(groupType) {
    this.group_type = groupType;
}).get(function(){
    return this.group_type;
});
CompanyGroup.virtual('memberLimit').get(function(){
    var memberLimit;
    if(this.level ==1){
        memberLimit = 10;
    }
    switch(this.level) {
        case 1:
            memberLimit = 10;
            break;
        case 2:
            memberLimit = 20;
            break;
        case 3:
            memberLimit = 50;
            break;
        default:
            memberLimit = 0;
    }
    return memberLimit;
});
/**
 * methods:
 */
CompanyGroup.methods = {
    /**
     * 用户是否是这个队的成员
     * @param  {String}  uid
     * @return {Boolean}
     */
    hasMember: function (uid) {
        for (var i = 0; i < this.member.length; i++) {
            if (uid.toString() === this.member[i]._id.toString()) {
                return true;
            }
        }
        for (var i = 0; i < this.leader.length; i++) {
            if (uid.toString() === this.leader[i]._id.toString()) {
                return true;
            }
        }
        return false;
    },
    /**
     * 用户是否是这个队的成员
     * @param  {String}  uid
     * @return {Boolean}
     */
    isLeader: function (uid) {
        for (var i = 0; i < this.leader.length; i++) {
            if (uid.toString() === this.leader[i]._id.toString()) {
                return true;
            }
        }
        return false;
    },
    updateLevel: function(score) {
        switch(this.level) {
            case 1:
                if(score>=200){
                    this.level =2;
                    return true;
                }
                else {
                    return false;
                }
                break;
            case 2:
                if(score>=500){
                    this.level =3;
                    return true;
                }
                else {
                    return false;
                }
                break;
            case 3:
            default:
                return false;
    }
    }
};



mongoose.model('CompanyGroup', CompanyGroup);