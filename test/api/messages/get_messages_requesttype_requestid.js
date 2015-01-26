var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /messages/:requestType/:requestId', function () {
    var accessToken;
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].users[1];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          accessToken = res.body.token;
          done();
        });
    });

    it('user应该成功收取自己的站内信', function (done) {
      request.get('/messages/user/' + data[0].teams[0].users[1].id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.count.should.be.a.Number;
          done();
        });
    });

    it('user不可以接收其他人的站内信', function (done) {
      request.get('/messages/user/' + data[0].teams[0].users[0].id)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

  });

};