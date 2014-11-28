//活动与组件映射表
'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
/**
 * 映射表
 */
var CampaignMold = new Schema({
    name:{//应与小组的类型名相同，如：羽毛球
        type:String,
        unique:true
    },
    module:[String],
    enable: {
        type: Boolean,
        default: true
    }
});


mongoose.model('CampaignMold', CampaignMold);
