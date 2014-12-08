'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

/**
 * 组件模型
 */
var GroupModel = new Schema({
    _id: String,
    group_type: String,
    entity_type: String,
    icon: String,//暂无值，todo
    active: {
        type: Boolean,
        default: false
    },
    group_rule: String,//不知何用
});
/**
 * Virtuals
 */
GroupModel.virtual('groupType').set(function(groupType) {
    this.group_type = groupType;
}).get(function(){
    return this.group_type;
});
GroupModel.virtual('entityType').set(function(entityType) {
    this.entity_type = entityType;
}).get(function(){
    return this.entity_type;
});

mongoose.model('Group', GroupModel);
