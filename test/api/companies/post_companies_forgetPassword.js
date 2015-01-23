var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');
var chance = require('chance').Chance();
var util = require('util');

module.exports = function () {
  var company;
  before(function() {
    var data = dataService.getData();
    company = data[0].model;
  })

  describe.skip('post /companies/forgetPassword',function() {
    it('填写正确邮箱返回201',function (done) {
      request.post('/companies/forgetPassword')
      .send({
        email: company.login_email,
      })
      .expect(201)
      .end(function (err, res) {
        if(err) return done(err);
        else done();
      });
    });

    it('填写不存在邮箱返回400及msg',function (done) {
      request.post('/companies/forgetPassword')
      .send({
        email: chance.email(),
      })
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        else{
          res.body.msg.should.equal('邮箱填写错误');
          done();
        }
      });
    });
  })
};