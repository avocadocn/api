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
 * 第五个公司被关闭, 第六个公司未验证
 */
var createCompanies = function(callback) {
  var companies = [];
  // The number of companies that you want to create
  var num = 6;
  for (var i = 0; i < num; i++) {
    // 非异步方法
    chance.generateCompanyData(function(err, result) {
      var company = new Company({
        status: {
          active: i===4 ? false : true,
          verification: i===5 ? 0 : 1
        },
        info: {
          name: result.name,
          city: {
            province: result.province,
            city: result.city,
            district: result.district
          },
          address: result.address,
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