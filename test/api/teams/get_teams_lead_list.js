// Copyright by ytoon, 2015/01/26
// Test the get goups routes.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');


module.exports = function() {

  describe('get /teams/lead/list', function() {
    var userAccessToken;

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
          userAccessToken = res.body.token;
          done();
        });
    });

    it('用户获取作为队长身份的小队', function(done) {
      request.get('/teams/lead/list')
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) console.log(err);
          res.body[0]._id.should.be.type('string');
          done();
        });
    });

    it('用户获取指定类型的小队', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      // 此类型：用户为队长
      request.get('/teams/lead/list' + '?gid=' + user.team[0].gid)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) console.log(err);
          res.body[0]._id.should.be.type('string');
          //done();
        });
        // 此类型：用户为非队长
        request.get('/teams/lead/list' + '?gid=' + user.team[1].gid)
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) console.log(err);
          res.body.should.be.empty;
          done();
        });

    });


  });
};