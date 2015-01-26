// Copyright by ytoon, 2015/01/26
// Test the get goups routes.
// 
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');


module.exports = function() {

  describe('get /groups', function() {
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

    it('小组类型验证', function(done) {
      request.get('/groups')
        .set('x-access-token', userAccessToken)
        .expect(200)
        .end(function(err, res) {
          if (err) console.log(err);
          res.body.length.should.equal(12);
          done();
        });
    });
  });
};