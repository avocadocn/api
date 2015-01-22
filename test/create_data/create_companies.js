'use strict';

var chance = require('./chance.js');
var common = require('../support/common.js');
var mongoose = common.mongoose;
var Company = mongoose.model('Company');
var tools = require('../../tools/tools.js');

/**
 * 生成公司数据
 * @param {Function} callback 形式为function(err, companies){}
 */
var createCompanies = function(callback) {
  var companies = [];
  // The number of companies that you want to create
  var num = 3;
  for (var i = 0; i < num; i++) {
    // 非异步方法
    chance.generateCompanyData(function(err, result) {
      var company = new Company({
        username: result.username,
        login_email: result.email,
        email: {
          domain: [result.email.split('@')[1]]
        },
        status: {
          mail_active: true,
          active: true
        },
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
          email: result.email,
          brief: result.brief,
          official_name: result.official_name
        },
        invite_key: tools.randomAlphaNumeric(8)
      });

      // Insert the company data to MongoDB 
      company.save(function(err) {
        if (err) {
          console.log(err.stack);
        }
      });

      companies.push(company);
    });
  }
  callback(null, companies);

};
module.exports = createCompanies;