'use strict';

var chance = require('./chance.js');
var common = require('../support/common.js');
var mongoose = common.mongoose;
var Company = mongoose.model('Company');
var tools = require('../../tools/tools.js');
var async = require('async');

/**
 * 生成公司数据
 * @param {Function} callback 形式为function(err, companies){}
 * 第6个公司未激活,第7个公司被关闭
 */
var createCompanies = function(callback) {
  var companies = [];
  // The number of companies that you want to create
  var num = 7;
  for (var i = 0; i < num; i++) {
    // 非异步方法
    chance.generateCompanyData(function(err, result) {
      var company = new Company({
        username: result.username,
        login_email: result.email,
        password:'55yali',
        email: {
          domain: [result.email.split('@')[1]]
        },
        status: {
          mail_active: i===5 ? false : true,
          active: i===6 ? false : true
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
      companies.push(company);
    });
  }

  async.map(companies, function (company, mapCallback) {
    company.save(mapCallback);
  }, function (err, results) {
    callback(err, companies);
  });

};
module.exports = createCompanies;