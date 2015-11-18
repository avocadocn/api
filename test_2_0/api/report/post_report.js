// Copyright by ytoon, 2015/01/23
// Test the post report route.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
/**
 * Test the post report route.
 * @return null
 */
module.exports = function() {
  describe('post /report', function() {
    var userAccessToken;
    var circleContent;
    before(function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      var user = data[0].users[0];
      
      request.post('/users/login')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }
          userAccessToken = res.body.token;
          request.post('/circle/contents')
            .field(
              'content', chance.string({
                length: 10,
                pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
              })
            )
            .set('x-access-token', userAccessToken)
            .expect(200)
            .end(function(err, res) {
              circleContent =res.body.circleContent;
              done();
            })
        });
    });

    it('有效用户举报有效类型', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "user",
        hostId: user._id,
        reportType: 0,
        content: ""
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
    it('有效朋友圈举报有效类型', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "circle",
        hostId: circleContent._id,
        reportType: 0,
        content: "22"
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
    it('有效活动举报有效类型', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "activity",
        hostId: data[0].activities[0]._id,
        reportType: 0,
        content: "22"
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
    it('有效投票举报有效类型', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "poll",
        hostId: data[0].polls[0]._id,
        reportType: 0,
        content: "22"
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
    it('有效求助举报有效类型', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "question",
        hostId: data[0].questions[0]._id,
        reportType: 0,
        content: "22"
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
    it('有效用户重复举报', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "user",
        hostId: user._id,
        reportType: 0,
        content: ""
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您已经举报过该记录');
          done();
        });
    });

    it('有效用户举报类型出错', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      var report = {
        hostType: "photos",
        hostId: user._id,
        reportType: 0,
        content: ""
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', userAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('举报主体类型只能是activity,poll,question,photo,circle,user');
          done();
        });
    });

  });
}