var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');

module.exports = function () {
  describe('get /notifications/:noticeType', function() {
    var data, userToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[0];
      request.post('/users/login')
      .send({
        phone: user.phone,
        password: '55yali'
      })
      .end(function (err, res) {
        if (res.statusCode === 200) {
          userToken = res.body.token;
        }
        done(err);
      });
    });

    it('用户应能获取自己的互动通知列表', function(done) {
      request.get('/notifications/interaction')
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('用户应能获取自己的系统通知列表', function(done) {
      request.get('/notifications/notice')
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });
  })
}