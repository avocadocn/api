var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');

module.exports = function () {
  var data, userToken, hrToken, campaignId;
  before(function (done) {
    data = dataService.getData();
    var user = data[0].users[0];
    campaignId = data[0].teams[0].campaigns[0]._id.toString();
    request.post('/users/login')
      .send({
        email: user.email,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.log(res.body);
          return done(err);
        }
        userToken = res.body.token;
      });
    request.post('/companies/login')
      .send({
        username: data[0].model.username,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.log(res.body);
          return done(err);
        }
        hrToken = res.body.token;
        done();
      });
  });

  describe('post /comments/read', function() {
    it('用户标记自己读过某活动的评论应返回200', function (done) {
      request.post('/comments/read')
        .set('x-access-token', userToken)
        .send({requestId:campaignId})
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
    });
    it('HR标记自己读过某活动的评论应返回403', function (done) {
      request.post('/comments/read')
        .query({type:'joined'})
        .set('x-access-token', hrToken)
        .send({requestId:campaignId})
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
    });
  })
};
