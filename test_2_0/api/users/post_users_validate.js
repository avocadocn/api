var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /users/validate', function () {

    it('查询是否注册时，已注册的手机号应提示已注册', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.post('/users/validate')
        .send({
          phone: user.phone
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.active.should.equal(true);
          res.body.msg.should.equal('已注册');
          done();
        });
    });

    it('查询是否注册时，未注册的手机号应返回未注册', function (done) {
      request.post('/users/validate')
        .send({
          phone: 13000000000
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.active.should.equal(false);
          res.body.msg.should.equal('未注册过');
          done();
        });
    });

    //网站来的和忘记密码不作测试，否则会发短信……

  });
};