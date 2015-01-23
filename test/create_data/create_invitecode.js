// Copyright by ytoon, 2015/01/23
// Not Complete. Maybe invitecode shouldn't be tested.
'use strict';

var common = require('../support/common');
var mongoose = common.mongoose;
var CompanyRegisterInviteCode = mongoose.model('CompanyRegisterInviteCode');

/**
 * Generate Invite Code
 * @param {Function} callback function(err, config){}
 */
var createInviteCode = function(company, callback) {
  var CompanyRegisterInviteCode = new CompanyRegisterInviteCode({

    company: company._id,

    use_by_company: {
      _id: Schema.Types.ObjectId,
      name: String,
      email: String
    },
    status: {
      type: String,
      enum: ['active', 'used'],
      default: 'active'
    }

  });
};

module.exports = createInviteCode;