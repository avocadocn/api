// Copyright by ytoon, 2015/01/27
// Test the delete /teams/:teamId/users/:userId routes.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');


module.exports = function() {

  describe('delete /teams/:teamId/users/:userId', function() {
    var userAccessToken;
    var companyAccessToken;

    before(function(done) {
      var data = dataService.getData();
      var company = data[1].model;
      var user = data[1].users[1];

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

    it('用户退出其公司小队', function(done) {
      var data = dataService.getData();
      var user = data[1].users[1];

      request.delete('/teams/' + user.team[0]._id + '/users/' + user._id)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.be.equal('退出成功');
          done();
        });
    });

    it('用户重复退出公司小队', function(done) {
      var data = dataService.getData();
      var user = data[1].users[1];

      request.delete('/teams/' + user.team[0]._id + '/users/' + user._id)
        .set('x-access-token', userAccessToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.be.equal('未参加此小队');
          done();
        });
    });

    it('用户指定其他用户退出公司小队', function(done) {
      var data = dataService.getData();
      var user = data[1].users[1];

      request.delete('/teams/' + user.team[0]._id + '/users/' + data[1].users[0]._id)
        .set('x-access-token', userAccessToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.msg.should.be.equal('权限错误');
          done();
        });
    });

  });
};