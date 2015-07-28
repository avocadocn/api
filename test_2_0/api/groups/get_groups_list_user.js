var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken;

  before(function(done) {
    data = dataService.getData();
    var user = data[2].users[0];
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
        userToken = res.body.token;
        done();
      });
  });

  describe('get /groups/list/user', function() {
    describe('获取个人群组列表', function() {
      it('用户能正确获取个人群组列表', function(done) {
        request.get('/groups/list/user')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.groups.length.should.equal(3);
            done();
          })
      });
    });
  });
}