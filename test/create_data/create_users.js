'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var User  = mongoose.model('User');
var chance = require('chance').Chance();

/**
 * 创建一个新成员
 * @param {Object} opts
 * @param {Function} callback 形式为funciton(err, user){}
 */
var createNewUser = function(opts, callback) {
  // var chance = new Chance();
  var email =chance.email({domain: opts.domain});
  var user = new User({
    username: email,
    password: '55yali',
    email: email,
    active: true,
    mail_active: true,
    nickname: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    realname: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    introduce: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    role: 'EMPLOYEE',
    cid: opts.cid,
    cname: opts.cname,
    company_official_name: opts.company_official_name
  });
  user.save(function(err) {
    if(err){
      callback(err);
    }else{
      callback(null, user);
    }
  });
}

/**
 * 创建公司的成员
 * @param {Object} company
 * @param {Function} callback 形式为function(err, users){}
 */
var createUsers = function (company, callback) {
  var i = 0;
  var users = [];
  var opts = {
    domain: company.email.domain,
    cid: company._id,
    cname: company.info.name,
    company_official_name: company.info.official_name
  };
  async.whilst(
    function() {return i<5},//生成5个人 需要时可调整
    function(cb) {
      createNewUser(opts, function(err, user) {
        i++;
        if(err){
          cb(err);
        }else{
          users.push(user);
          cb();
        }
      });
    },
    function(err) {
      if(err) {
        console.log(err);
      } else {
        callback(null, users);
      }
    }
  );
};

module.exports = createUsers;