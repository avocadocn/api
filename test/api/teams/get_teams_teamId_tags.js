// Copyright by ytoon, 2015/01/26
// Test the get teams/:teamId/tags routes.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');


module.exports = function() {

  describe('get /teams/:teamId/tags', function() {
    var userAccessToken = [,];
    var companyAccessToken;

    before(function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      var user = data[0].users[0];

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
          userAccessToken[0] = res.body.token;
          //done();
        });

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
          userAccessToken[1] = res.body.token;
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

    it('有效用户获取所在小队标签信息', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.get('/teams/'+ user.team[0]._id + '/tags')
        .set('x-access-token', userAccessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.should.be.type('object');
          done();
        });
    });

    it('有效用户获取所在公司其他小队标签信息', function(done) {
      var data = dataService.getData();
      var user = data[0].users[2];
      request.get('/teams/'+ user.team[0]._id + '/tags')
        .set('x-access-token', userAccessToken[1])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          
          done();
        });
    });

    // Produre Error: a user can't get tags of teams of other company.
    it('有效用户获取其他公司小队标签信息，权限不够', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.get('/teams/'+ data[1].users[0].team[0]._id + '/tags')
        .set('x-access-token', userAccessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);
          
          done();
        });
    });

    it('有效公司获取其公司小队标签信息', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.get('/teams/'+ user.team[0]._id + '/tags')
        .set('x-access-token', companyAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          
          res.body.should.be.type('object');
          done();
        });
    });
    // Produre Error: a company can't get tags of teams of other company.
    it('有效公司获取其他公司小队标签信息，权限不够', function(done) {
      var data = dataService.getData();
      var user = data[1].users[0];

      request.get('/teams/'+ user.team[0]._id + '/tags')
        .set('x-access-token', companyAccessToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);
          
          done();
        });
    });

  });
};