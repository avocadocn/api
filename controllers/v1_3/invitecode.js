'use strict';

var mongoose = require('mongoose');
var CompanyRegisterInviteCode = mongoose.model('CompanyRegisterInviteCode');

var log = require('../../services/error_log.js');

module.exports = {
    checkInviteCode: function (req, res) {
      CompanyRegisterInviteCode.findOne({
        'code': req.query.invite_code
      }, function(err, code) {
        if (err || !code) {
          res.status(404).send({ validate:false, msg:'该邀请码不存在' });
        } else {
          if (code.status === 'active') {
            res.status(200).send({ validate:true });
          } else {
            res.status(200).send({ validate:false, msg:'该邀请码已经被激活' });
          }
        }
      });
    }
}