'use strict';

var crypto = require('crypto');
var util = require('util');
var path = require('path');

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var User = mongoose.model('User');
var async = require('async');
var moment = require('moment');
var Q = require('q');

var log = require('../../services/error_log.js');
var emailService = require('../../services/email.js');
var tokenService = require('../../services/token.js');
var auth = require('../../services/auth.js');
var donlerValidator = require('../../services/donler_validator.js');
var uploader = require('../../services/uploader.js');
var syncData = require('../../services/sync_data.js');
var tools = require('../../tools/tools.js');
var qrcodeService = require('../../services/qrcode');
var easemob = require('../../services/easemob.js');
var multiparty = require('multiparty');

module.exports = {
  validateSuperAdmin: function(req, res, next) {
    if(req.user.isSuperAdmin(req.params.companyId)) {
      next();
    }
    else {
      return res.status(403).send({msg:'权限不足'});
    }
  },

  getCompany: function(req, res) {
    //todo 判断从app来or网页来
    var isAdmin = false;
    var outputOptions = {};
    if(isAdmin) {
      outputOptions = {status:1, team:1, info:1};
    }
    else {
      outputOptions = {info:1};
    }
    Company.findOne({_id:req.params.companyId, 'status.active':true}, outputOptions, function(err, company) {
      if(err) {
        log(err);
        return res.status(500).send({msg:'公司查找错误'});
      }
      else {
        return res.status(200).send({company: company});
      }
    });
  }
};