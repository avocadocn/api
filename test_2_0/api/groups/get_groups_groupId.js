var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');
var should = require('should');

module.exports = function() {
  var data, userToken;

  before(function(done) {
    data = dataService.getData();
    var user = data[2].users[0];
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
        userToken = res.body.token;
        done();
      });
  });

  describe('get /groups/:groupId', function() {
    describe('获取群组信息', function() {
      it('用户能获取某个参加的群组基本信息', function(done) {
        request.get('/groups/' + data[2].teams[0].model._id.toString())
          .query({
            'allInfo': false
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
      it('用户能获取某个参加的群组详细信息', function(done) {
        request.get('/groups/' + data[2].teams[0].model._id.toString())
          .query({
            'allInfo': true
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
  });
}