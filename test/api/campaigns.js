var app = require('../../config/express.js'),
  request = require('supertest')(app);

var common = require('./common.js');

describe('api campaigns', function () {

  var accessToken;

  before(function (done) {
    var data = common.getData();
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

  describe('get /campaigns/:campaignId', function () {

    it('should get campaign', function (done) {
      var data = common.getData();
      var campaign = data.companies[0].campaigns[0];
      request.get('/campaigns/' + campaign.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body._id.should.equal(campaign.id);
          done();
        });
    });

  });

});