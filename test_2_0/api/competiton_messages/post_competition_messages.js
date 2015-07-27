var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
module.exports = function () {
  describe('post /competition_messages', function () {
    var userToken;
    var data;
    before(function(done) {
      data = dataService.getData();
      var user = data[0].teams[0].leaders[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            userToken = res.body.token;
          }
          done();
        });
    });

    it('本队队长应能成功发送同类型不同公司的挑战', function(done) {
      var messageData = {
        sponsor: data[0].teams[0].model._id,
        opposite: data[1].teams[0].model._id,
        type: 1,
        content: chance.string({length: 10})
      };
      request.post('/competition_messages')
      .send(messageData)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('本队队长应能成功发送不同类型同公司的联谊', function(done) {
      // teams[0]
      var messageData = {
        sponsor: data[0].teams[0].model._id,
        opposite: data[0].teams[1].model._id,
        type: 2,
        content: chance.string({length: 10})
      };
      request.post('/competition_messages')
      .send(messageData)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('本队队长应不能发送不同类型不同公司的挑战信', function(done) {
      // teams[0]
      var messageData = {
        sponsor: data[0].teams[0].model._id,
        opposite: data[1].teams[1].model._id,
        type: 1,
        content: chance.string({length: 10})
      };
      request.post('/competition_messages')
      .send(messageData)
      .set('x-access-token', userToken)
      .expect(422)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('非本队队长应不能发送挑战信', function(done) {
      var messageData = {
        sponsor: data[0].teams[1].model._id,
        opposite: data[1].teams[1].model._id,
        type: 1,
        content: chance.string({length: 10})
      };
      request.post('/competition_messages')
      .send(messageData)
      .set('x-access-token', userToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
  })
};