var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/login', function () {

    it('should login success if email and password are correct', function (done) {
      var data = dataService.getData();
      var user = data.companies[0].users[0];

      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.cid.should.equal(user.cid.toString());
          res.body.id.should.equal(user.id);

          jwt.verify(res.body.token, common.config.token.secret, function (err, decoded) {
            if (err) {
              console.log(err);
              err.should.not.be.ok;
            } else {
              decoded.id.should.equal(user.id);
              decoded.type.should.equal('user')
            }
            done();
          });

        });
    });

    it('should login failed if password is incorrect', function (done) {
      var data = dataService.getData();
      var user = data.companies[0].users[0];

      request.post('/users/login')
        .send({
          email: user.email,
          password: '123456'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('密码输入错误,请检查重试。');
          done();
        });
    });

    it('should login failed if email is not exists', function (done) {
      request.post('/users/login')
        .send({
          email: 'unexits',
          password: '123456'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('邮箱地址不存在,请检查或注册。');
          done();
        });
    });

  });

};