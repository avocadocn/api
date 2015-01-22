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

    it('should get campaign', function (done) {
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

  });
};

