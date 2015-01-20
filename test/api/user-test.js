// Copyright by ytoon, 2014-01-18.
// This file is bulit for test and generates random user use cases. 
// 

'use strict';

var chance   = require('./chance.js');
var mongoose = require('mongoose');
var fs       = require('fs');

var User  = mongoose.model('User')


/**
 * The function produce random user datas and insert them to the
 * MongoDB.
 *
 * /num: the number of datas that you want to produce and insert
 *
 **/
 exports.randomUserData = function(num){
  fs.readFile('/data/company.txt', 'utf8', function(err, data) {
    var companys = data.split('\n');
    for(var i = 0; i < companys.length - 1; i++) {
      var company = JSON.parse(companys[i]);
      var domain = company.email.split('@')[1];
      for(var j = 0; j < num; j++) {
      chance.generateUserData(domain, function(err, result) {
        var user = new User({
          email: result.email,
          username: result.email,
          cid: company._id,
          cname: company.name,
          nickname: result.nickname,
          password: result.password,
          realname: result.realname,
          phone: result.phone,
          role: 'EMPLOYEE',
          active: true
        });
        // Insert user data to MongoDB
        user.save(function(err) {
          if(err) console.log(err);
          process.exit(0);
        });
        result.cname = company.name;
        result._id   = user._id;
        // Write random user data to user.txt
        fs.appendFile('/data/user.txt', JSON.stringify(result) + '\n', function(err) {
          if(err) throw err;
        });
      });
     }
    }
  });
}
