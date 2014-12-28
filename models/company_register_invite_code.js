'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var tools = require('../tools/tools.js');

var CompanyRegisterInviteCode = new Schema({

  code: {
    type: String,
    unique: true
  },

  company: {
    type: Schema.Types.ObjectId,
    ref: "Company"
  },

  use_by_company:{
    _id:Schema.Types.ObjectId,
    name:String,
    email:String
  },
  status:{
    type:String,
    enum:['active','used'],
    default:'active'
  }

});

CompanyRegisterInviteCode.pre('save', function(next) {
  if (!this.code) {
    this.code = tools.randomAlphaNumeric(8);
  }
  next();
});

mongoose.model('CompanyRegisterInviteCode', CompanyRegisterInviteCode);
