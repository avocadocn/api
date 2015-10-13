var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/login', function () {

    it('管理员手机号和密码正确应该登录成功', function (done) {
      var data = dataService.getData();
      var user = data[0].users[5];

      request.post('/users/adminlogin')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.cid.should.equal(user.cid.toString());
          res.body.id.should.equal(user.id);
          res.body.role.should.equal(user.role);

          jwt.verify(res.body.token, common.config.token.secret, function (err, decoded) {
            if (err) {
              return done(err);
            } else {
              decoded.id.should.equal(user.id);
              decoded.type.should.equal('user');
            }
            done();
          });

        });
    });

    it('密码错误应该登录失败', function (done) {
      var data = dataService.getData();
      var user = data[0].users[5];

      request.post('/users/adminlogin')
        .send({
          phone: user.phone,
          password: '123456'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('密码输入错误,请检查重试。');
          done();
        });
    });

    it('手机号不存在应该登录失败', function (done) {
      request.post('/users/adminlogin')
        .send({
          phone: 'unexits',
          password: '123456'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('账号不存在,请检查或注册。');
          done();
        });
    });

    it('不是大使应该登录失败', function(done) {
      var data = dataService.getData();
      var user = data[0].users[2];
      request.post('/users/adminlogin')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您不是管理员无法进行登录管理界面');
          done();
        })
    });

  });

};