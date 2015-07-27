var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/login', function () {

    it('邮箱和密码正确应该登录成功', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

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

    it('附带设备信息后应该登录成功', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.post('/users/login')
        .set('x-app-id', "id1a2b3c4d5e6f")
        .set('x-api-key', "key1a2b3c4d5e6f")
        .set('x-device-id', "429F38FB-35FD-49ED-8E90-B5ACA9FC7468")
        .set('x-device-type', "iPhone5,2")
        .set('x-platform', "iOS")
        .set('x-version', "8.1.2")
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

    it('密码错误应该登录失败', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

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

    it('邮箱不存在应该登录失败', function (done) {
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

    it('未激活的账号无法登录', function (done) {
      var data = dataService.getData();
      var user = data[0].users[5];
      user.mail_active.should.be.false;
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('账号未激活,请至邮箱点击链接激活。');
          done();
        });
    });

    it('被HR关闭的账号无法登录', function (done) {
      var data = dataService.getData();
      var user = data[0].users[6];
      user.active.should.be.false;
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您的账号已被公司管理员禁用。');
          done();
        });
    });

    it('被donler关闭的账号无法登录', function (done) {
      var data = dataService.getData();
      var user = data[0].users[7];
      user.disabled.should.be.true;
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('账号已被关闭。');
          done();
        });
    });

  });

};