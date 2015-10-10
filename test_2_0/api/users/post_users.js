var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe.skip('post /users', function () {

    it('正常数据应该注册成功', function (done) {
      var data = dataService.getData();
      var company = data[0].model;

      request.post('/users')
        .send({
          email: 'userrgtest@' + company.email.domain[0],
          nickname: 'UserRgTestNickname',
          realname: 'UserRgTestRealname',
          cid: company.id,
          password: '55yali',
          phone: '12345678901'
        })
        .expect(201)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            done();
          }
        });

    });

    it('被使用过的邮箱应该返回错误提示', function (done) {
      var data = dataService.getData();
      var company = data[0].model;
      var user = data[0].users[0];

      request.post('/users')
        .send({
          phone: user.phone,
          nickname: 'UserRgTestNickname',
          realname: 'UserRgTestRealname',
          cid: company.id,
          password: '55yali',
          phone: '12345678901'
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            res.body.msg.should.equal('该邮箱已被注册');
            done();
          }
        });
    });

    it('邮箱后缀和公司邮箱不符合时应该返回错误提示', function (done) {
      var data = dataService.getData();
      var company = data[0].model;
      var user = data[0].users[0];

      request.post('/users')
        .send({
          email: 'example@donlertest.com',
          nickname: 'UserRgTestNickname',
          realname: 'UserRgTestRealname',
          cid: company.id,
          password: '55yali',
          phone: '12345678901'
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            res.body.msg.should.equal('邮箱后缀与公司允许的后缀不一致');
            done();
          }
        });
    });

    it('昵称、密码、手机号码不符合要求时应该返回错误提示', function (done) {
      var data = dataService.getData();
      var company = data[0].model;

      request.post('/users')
        .send({
          email: 'userrgtest2@' + company.email.domain[0],
          nickname: 'UserRgTestNicknameMoreThan20Char',
          realname: 'UserRgTestRealname',
          cid: company.id,
          password: '55',
          phone: '12345678901a'
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          } else {
            res.body.msg.should.equal('昵称最大长度为20;密码最小长度为6;手机号码必须是数字');
            done();
          }
        });
    });

  });

};