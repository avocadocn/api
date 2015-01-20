// Copyright by ytoon, 2014-01-18.
// This file is bulit for test and generates random company use cases. 
// 

'use strict';

var chance   = require('./chance.js');
var mongoose = require('mongoose');
var fs 	     = require('fs');

var Company  = mongoose.model('Company')


/**
 * The function produce random company datas and insert them to the
 * MongoDB.
 *
 * /num: the number of datas that you want to produce and insert
 * 
 **/

exports.randomCompanyData = function(num) {
  for(var i = 0; i < num; i++) {
    chance.generateCompanyData(function(err, result) {
        var company = new Company({
        info: {
          name: result.name,
          city: {
            province: result.province,
            city: result.city,
            district: result.district
          },
          address: result.address,
          lindline: {
            areacode: result.areacode,
            number: result.tel,
            extension: result.extension
          },
          linkman: result.contacts,
          phone: result.phone,
          email: result.email
        },
        login_email: result.email,
        email: {
          domain: [result.email.split('@')[1]]
        }
      });
      // Insert the company data to MongoDB 
      company.save(function(err) {
        if(err) console.log(err);
        process.exit(0);
      });
      // save the company info to the company.txt
      result._id = company._id;
      fs.appendFile('/data/company.txt', JSON.stringify(result) + '\n', function(err) {
        if(err) throw err;
      });
    });       
  }
}

