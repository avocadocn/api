var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var mongoose = common.mongoose;
var Company = mongoose.model('Company');
var dataService = require('../../create_data');
var chance = require('chance').Chance();

module.exports = function () {
  before(function() {
    //user登录
    //company登录
  })
  describe('post /companies', function () {
    //hr或拿inviteKey

    //user拿company数据
    
    //company 拿company数据
  })
};