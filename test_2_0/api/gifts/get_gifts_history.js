var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');

module.exports = function () {
  describe('get /gifts/history/:userId/:direction', function() {
    var data, user, userToken;
    before(function (done) {
      data = dataService.getData();
      user = data[0].users[0];
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

    it('获取用户收到的礼物列表应成功', function(done) {
      request.get('/gifts/history/' + user._id + '/receive')
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.instanceOf(Array);
        res.body.should.have.length(5);
        done();
      });
    });

    it('获取用户发出的礼物列表应成功', function(done) {
      request.get('/gifts/history/' + user._id + '/send')
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.instanceOf(Array);
        res.body.should.have.length(15);
        done();
      });
    });

    it('获取其他人的礼物列表应失败', function(done) {
      request.get('/gifts/history/0/send')
      .set('x-access-token', userToken)
      .expect(403)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

  })
}