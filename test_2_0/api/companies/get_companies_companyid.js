var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var dataService = require('../../create_data');

module.exports = function () {

  describe.skip('get /companies', function () {
    before(function() {
      //user1登录
      //user2登录
      //company1登录
      //company2登录
    })
    //需求不明，暂且放一下
    //hr或member拿inviteKey

    //user拿company数据
    
    //company 拿company数据
  })
};