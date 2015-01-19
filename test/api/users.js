var app = require('../../config/express.js')
  , request = require('supertest');

request = request(app);

var common = require('./common.js');

describe('api users', function () {



  describe('post /users/login', function () {

    it('should login success if email and password are correct', function (done) {

      var data = common.getData();
      var user = data.companies[0].users[0];

      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          res.body.cid.should.equal(user.cid.toString());
          res.body.id.should.equal(user.id);

          // todo validate token

          done();
        });
    });

    it('should login failed if password is incorrect', function (done) {

      request.post('/users/login')
        .send({
          email: 'cahavar@55yali.com',
          password: '123456'
        })
        .expect(401)
        .end(function (err, res) {
          res.body.msg.should.equal('密码输入错误,请检查重试。')
          done();
        });
    });

  });

});