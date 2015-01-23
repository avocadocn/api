var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /campaigns/:campaignId', function () {

    var accessToken;

    before(function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];
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

    it('should get company campaign', function (done) {
      var data = dataService.getData();
      var campaign = data[0].campaigns[0];
      request.get('/campaigns/' + campaign.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body._id.should.equal(campaign.id);
          done();
        });
    });

    it('should get team campaign', function (done) {
      var data = dataService.getData();
      var campaign = data[0].teams[0].campaigns[0];
      request.get('/campaigns/' + campaign.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body._id.should.equal(campaign.id);
          done();
        });
    });
    it('should get 404', function (done) {
      request.get('/campaigns/111')
        .set('x-access-token', accessToken)
        .expect(404)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('找不到该活动');
          done();
        });
    });

    it('should get 403', function (done) {
      var data = dataService.getData();
      var campaign = data[1].campaigns[0];
      request.get('/campaigns/' + campaign.id)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您没有权限');
          done();
        });
    });
    it('should get 401', function (done) {
        var data = dataService.getData();
        var campaign = data[0].campaigns[0];
        request.get('/campaigns/' + campaign.id)
          .set('x-access-token', '111')
          .expect(401)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有登录或者登录超时，请重新登录');
            done();
          });
      });
  });
};

