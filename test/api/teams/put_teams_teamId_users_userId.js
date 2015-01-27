// Copyright by ytoon, 2015/01/26
// Test the put /teams/:teamId/users/:userId routes.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');


module.exports = function() {

  describe('put /teams/:teamId/users/:userId', function() {
    var data, userAccessToken, companyAccessToken;

    before(function(done) {
      data = dataService.getData();
      var company = data[0].model;
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

    it('用户参加其公司小队', function (done) {
      var user = data[0].users[1];

      request.put('/teams/' + data[0].users[2].team[0]._id + '/users/' + user._id)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.be.equal('加入成功');
          done();
        });
    });

    it('用户重复参加其公司小队应返回400', function (done) {
      var user = data[0].users[1];

      request.put('/teams/' + user.team[0]._id + '/users/' + user._id)
        .set('x-access-token', userAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.be.equal('已参加');
          done();
        });
    });

    it('用户参加其他公司小队应返回403', function (done) {
      //第一个公司的人参加第二个公司的小队
      var user = data[0].users[1];
      request.put('/teams/' + data[1].teams[0].model._id + '/users/' + user._id)
        .set('x-access-token', userAccessToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.be.equal('权限错误');
          done();
        });
    });

    it('HR参加公司小队应返回400', function (done) {
      request.put('/teams/' + data[1].teams[0].model._id + '/users/' + data[0].model._id)
        .set('x-access-token', companyAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    //暂时无此功能，不作测试
    // it('HR指定用户参加其公司小队', function(done) {
    //   var data = dataService.getData();
    //   var user = data[0].users[2];

    //   request.put('/teams/' + data[0].users[1].team[0]._id + '/users/' + user._id)
    //     .set('x-access-token', companyAccessToken)
    //     .expect(200)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.msg.should.be.equal('加入成功');
    //       done();
    //     });
    // });

    // it('HR指定用户重复参加其公司小队', function(done) {
    //   var data = dataService.getData();
    //   var user = data[0].users[2];

    //   request.put('/teams/' + data[0].users[1].team[0]._id + '/users/' + user._id)
    //     .set('x-access-token', companyAccessToken)
    //     .expect(400)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.msg.should.be.equal('已加入');
    //       done();
    //     });
    // });

    // it('HR指定用户重复参加其他公司小队', function(done) {
    //   var data = dataService.getData();
    //   var user = data[0].users[2];

    //   request.put('/teams/' + data[1].teams[0].model._id + '/users/' + user._id)
    //     .set('x-access-token', companyAccessToken)
    //     .expect(403)
    //     .end(function(err, res) {
    //       if (err) return done(err);
    //       res.body.msg.should.be.equal('权限错误');
    //       done();
    //     });
    // });

  });
};