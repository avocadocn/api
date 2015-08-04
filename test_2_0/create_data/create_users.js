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
    gender: chance.bool(),
    nickname: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    realname: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
    introduce: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),
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

var addConcern = function(users, callback) {
  //第0个人关注第1、2、3、4个人
  //第1个人关注第0个人
  async.parallel([
    function(pcb) {
      users[0].concern = [];
      for(var i=1; i<5; i++) {
        users[0].concern.push({
          user: users[i]._id,
          createTime: new Date()
        });
      }
      users[0].save(function(err) {
        pcb(err);
      });
    },
    function(pcb) {
      users[1].concern = [{
        user: users[0]._id,
        createTime: new Date()
      }];
      users[1].save(function(err) {
        pcb(err);
      });
    }
  ],function(err, results) {
    callback(err);
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
        callback(err);
      } else {
        addConcern(users, function(err) {
          callback(err, users);
        })
      }
    }
  );
};

module.exports = createUsers;