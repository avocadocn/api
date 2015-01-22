var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /users/validate', function () {

    it('已注册激活的邮箱应该返回{active:3}', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.post('/users/validate')
        .send({
          email: user.email
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.active.should.equal(3);
          done();
        });
    });

    it('没有注册过的邮箱应该返回{active:1}', function (done) {
      request.post('/users/validate')
        .send({
          email: 'example@email.com'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.active.should.equal(1);
          done();
        });
    });


  });
};