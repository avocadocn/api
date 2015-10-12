var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users', function () {

    it('正常数据应该注册成功', function (done) {
      var data = dataService.getData();
      var company = data[0].model;

      request.post('/users')
        .send({
          phone: '13636101111',
          name: 'UserRgTestName',
          cid: company.id,
          password: '55yali',
          gender: 0,
          enrollment: 2015
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            done();
          }
        });

    });

    it('用使用过的手机号注册应该返回错误提示', function (done) {
      var data = dataService.getData();
      var company = data[0].model;
      var user = data[0].users[0];

      request.post('/users')
        .send({
          phone: '13636101111',
          name: 'UserRgTestName',
          cid: company.id,
          password: '55yali',
          gender: 0,
          enrollment: 2015
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            res.body.msg.should.equal('该手机号已被注册');
            done();
          }
        });
    });

    it('密码、手机号码不符合要求时应该返回错误提示', function (done) {
      var data = dataService.getData();
      var company = data[0].model;

      request.post('/users')
        .send({
          name: 'UserRgTestNicknameMoreThan20Char',
          cid: company.id,
          password: '55',
          phone: '12345678901a',
          gender: 0
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            res.body.msg.should.equal('手机号不是有效的手机号格式;密码最小长度为6');
            done();
          }
        });
    });

    //网页版测试todo

  });

};