'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;


//部门成员
var _member = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    nickname: String,
    photo: String,
    apply_status:{
      type:String,
      enum:['pass','reject','wait'],
      default:'wait'
    }
});

var Department = new Schema({
  level:Number,
  name:String,
  company:{
    _id:Schema.Types.ObjectId,
    name:String,
    logo:String
  },
  status:{
    type:String,
    enum:['active','closed','delete'],
    default:'active'
  },
  team:{
    type: Schema.Types.ObjectId,
    ref: 'CompanyGroup'
  },
  parent_department:{
    type: Schema.Types.ObjectId,
    ref: 'Department'
  },
  manager:[_member],
  member:[_member]
});


mongoose.model('Department', Department);