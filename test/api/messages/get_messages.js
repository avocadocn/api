var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /messages', function () {
    var accessToken;
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].leaders[0];
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

    var hrToken;
    before(function (done) {
      data = dataService.getData();
      var company = data[0].model;
      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          hrToken = res.body.token;
          done();
        });
    });


    var testMessageType = function (type) {
      it('应该成功获取' + type + '站内信', function (done) {
        request.get('/messages')
          .set('x-access-token', accessToken)
          .query({
            requestType: type,
            requestId: data[0].teams[0].leaders[0].id
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });
    };

    ['private', 'team', 'all', 'global'].map(function (item) {
      testMessageType(item);
    });

    var testCampaignAndLimit = function (role) {
      it(role + '应该成功获取10个活动站内信', function (done) {
        var token = accessToken;
        if (role === 'hr') {
          token = hrToken;
        }

        request.get('/messages')
          .set('x-access-token', token)
          .query({
            requestType: 'campaign',
            requestId: data[0].teams[0].campaigns[0].id,
            limit: 10
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.length.should.equal(10);
            done();
          });
      });
    };

    testCampaignAndLimit('user');
    testCampaignAndLimit('hr');




  });

};