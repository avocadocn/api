// Copyright by ytoon, 2015/01/23
// Not Complete. Maybe invitecode shouldn't be tested.
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('get /timeline/record/', function() {

    var accessToken;
    before(function(done) {
      var data = dataService.getData();
      var user = data[0].users[1];

      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessToken = res.body.token;
          done();
        });
    });

    it('有效用户获取活动时间', function(done) {
      var data = dataService.getData();
      var user = data[0].users[1];
      request.get('/timeline/record/user/' + user._id.toString())
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('有效用户获取所在公司活动时间', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/record/company/' + company._id.toString())
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('有效用户获取其它公司活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var company = data[1].model;
      request.get('/timeline/record/company/' + company._id.toString())
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('有效用户获取所在小队活动时间', function(done) {
      var data = dataService.getData();
      var team = data[0].users[1].team[0];
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('有效用户获取所在公司其它小队活动时间', function(done) {
      var data = dataService.getData();
      var team = data[0].users[2].team[0];
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('有效用户获取其它公司小队活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var team = data[1].users[0].team[0];
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });
    // it('it should be the invitecode exists and active', function(done) {

    //   request.get('/region' + campaign.id)
    //     .expect(200)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.validate.should.equal(false);
    //       done();
    //     });
    // });

    // it('it should be the invitecode do not exists', function(done) {

    //   request.get('/region' + campaign.id)
    //     .expect(404)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.validate.should.equal(false);
    //       done();
    //     });
    // });

  });
};