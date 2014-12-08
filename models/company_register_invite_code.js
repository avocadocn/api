'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var crypto = require('crypto');

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
    var salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
    this.code = crypto.pbkdf2Sync(Date.now().toString(), salt, 10000, 6).toString('base64');
  }
  next();
});

mongoose.model('CompanyRegisterInviteCode', CompanyRegisterInviteCode);
