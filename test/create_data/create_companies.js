'use strict';

var chance = require('./chance.js');
/**
 * 生成公司数据
 * @param {Function} callback 形式为function(err, companies){}
 */
var createCompanies = function(callback) {
  var companies = [];
  // The number of companies that you want to create
  var num = 3;
  for (var i = 0; i < num; i++) {
    chance.generateCompanyData(function(err, result) {
      var company = new Company({
        username: data.username,
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
          email: result.email
        }
      });

      // Insert the company data to MongoDB 
      company.save(function(err) {
        if (err) console.log(err);
        process.exit(0);
      });

      companies.push(company);
    });
  }
  callback(null, companies);

};

module.exports = createCompanies;