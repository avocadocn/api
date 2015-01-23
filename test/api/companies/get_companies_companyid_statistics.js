var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var dataService = require('../../create_data');
var chance = require('chance').Chance();

module.exports = function () {
  before(function() {
    data = dataService.getData();

  })

  describe('get /companies/:companyId/statistics', function () {
    // it('本公司HR获取公司小队统计数据成功', function (done) {

    // });
    // it('本公司HR获取公司小队统计数据成功', function (done) {

    // });
  })
};
