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
    active: opts.active,
    mail_active: opts.mail_active,
    disabled: opts.disabled,
    sex: chance.character({ pool: '男女' }),
    nickname: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    realname: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    introduce: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    role: 'EMPLOYEE',
    cid: opts.cid,
    cname: opts.cname,
    company_official_name: opts.company_official_name,
    birthday: chance.birthday(),
    phone: chance.string({ pool: '0123456789', length: 11 })
  });
  user.save(function(err) {
    if(err){
      callback(err);
    }else{
      callback(null, user);
    }
  });
};

/**
 * 创建公司的成员
 * 前5个为正常用户，第6个未激活，第7个被HR关闭，第8个被管理员关闭，第9个用户用于修改信息测试，第10个用于测试被hr关闭
 * @param {Object} company
 * @param {Function} callback 形式为function(err, users){}
 */
var createUsers = function (company, callback) {
  if (company.status.mail_active === false) {
    callback(null, []);
    return;
  }

  var i = 0;
  var users = [];

  async.whilst(
    function() {return i<10},//生成10个人 需要时可调整
    function(cb) {

      var opts = {
        domain: company.email.domain,
        cid: company._id,
        cname: company.info.name,
        company_official_name: company.info.official_name,
        active: true,
        mail_active: true,
        disabled: false
      };
      if (i === 5) {
        opts.mail_active = false;
      }
      if (i === 6) {
        opts.active = false;
      }
      if (i === 7) {
        opts.disabled = true;
      }

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