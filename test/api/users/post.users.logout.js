var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/logou', function () {

    var accessToken;
    beforeEach(function (done) {
      var data = dataService.getData();
      var user = data.companies[0].users[0];
      request.post('/users/login')
        .send({
          email: user.email,
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

    it('should logout success if token is correct', function (done) {
      request.post('/users/logout')
        .set('x-access-token', accessToken)
        .expect(204)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('should receive 401 if token is incorrect', function (done) {
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