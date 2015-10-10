// Copyright by ytoon, 2015/01/23
// Test the post report route.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

/**
 * Test the post report route.
 * @return null
 */
module.exports = function() {
  describe('post /report', function() {
    var userAccessToken;
    var companyAccessToken;

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
            console.log(res.body);
            return done(err);
          }
          userAccessToken = res.body.token;
          //done();
        });

      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          companyAccessToken = res.body.token;
          done();
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
          res.body.msg.should.equal('举报主体类型只能是user,comment,photo');
          done();
        });
    });

    it('有效公司举报有效类型', function(done) {
      var data = dataService.getData();
      var user = data[0].users[1];

      var report = {
        hostType: "user",
        hostId: user._id,
        reportType: 0,
        content: ""
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', companyAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('有效公司重复举报', function(done) {
      var data = dataService.getData();
      var user = data[0].users[1];

      var report = {
        hostType: "user",
        hostId: user._id,
        reportType: 0,
        content: ""
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', companyAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您已经举报过该记录');
          done();
        });
    });

    it('有效公司举报类型出错', function(done) {
      var data = dataService.getData();
      var user = data[0].users[1];

      var report = {
        hostType: "photos",
        hostId: user._id,
        reportType: 0,
        content: ""
      };

      request.post('/report')
        .send(report)
        .set('x-access-token', companyAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('举报主体类型只能是user,comment,photo');
          done();
        });
    });

  });
}