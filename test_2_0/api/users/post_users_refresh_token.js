var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/refresh/token', function () {

    var accessToken;
    beforeEach(function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.post('/users/login')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            accessToken = res.body.token;
          }
          done();
        });
    });

    it('已经登录的用户应该正常刷新token', function (done) {
      request.post('/users/refresh/token')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('如果token不正确，则会返回401', function (done) {
      request.post('/users/logout')
        .set('x-access-token', 'random')
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

  });

};