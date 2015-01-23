var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');
var util = require('util');

module.exports = function () {

  describe('post /companies/login', function () {

    it('公司用户名和密码正确应该登录成功', function (done) {
      var data = dataService.getData();
      var company = data[0].model;

      request.post('/companies/login')
      .send({
        username: company.username,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.id.should.equal(company._id.toString());

        jwt.verify(res.body.token, common.config.token.secret, function (err, decoded) {
          if (err) {
            console.log(err);
            err.should.not.be.ok;
          } else {
            decoded.id.should.equal(company._id.toString());
            decoded.type.should.equal('company')
          }
          done();
        });

      });
    });

    var loginErrorTest = function(data,msg) {
      // var 
      it('密码错误应该登录失败', function (done) {
        var data = dataService.getData();
        var user = data[0].model;

        request.post('/companies/login')
          .send({
            email: data.email? data.email : company.username,
            password: data.password ? data.password :'123456'
          })
          .expect(401)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('密码输入错误,请检查重试。');
            done();
          });
      });
    };
    //密码
    //用户名
    //未激活
    //被关闭
    // it('密码错误应该登录失败', function (done) {
    //   var data = dataService.getData();
    //   var user = data[0].users[0];

    //   request.post('/users/login')
    //     .send({
    //       email: user.email,
    //       password: '123456'
    //     })
    //     .expect(401)
    //     .end(function (err, res) {
    //       if (err) return done(err);
    //       res.body.msg.should.equal('密码输入错误,请检查重试。');
    //       done();
    //     });
    // });

    // it('用户名不存在应该登录失败', function (done) {
    //   request.post('/users/login')
    //     .send({
    //       email: 'unexits',
    //       password: '123456'
    //     })
    //     .expect(401)
    //     .end(function (err, res) {
    //       if (err) return done(err);
    //       res.body.msg.should.equal('邮箱地址不存在,请检查或注册。');
    //       done();
    //     });
    // });

    // it('用户名不存在应该登录失败', function (done) {
    //   request.post('/users/login')
    //     .send({
    //       email: 'unexits',
    //       password: '123456'
    //     })
    //     .expect(401)
    //     .end(function (err, res) {
    //       if (err) return done(err);
    //       res.body.msg.should.equal('邮箱地址不存在,请检查或注册。');
    //       done();
    //     });
    // });

  });

};