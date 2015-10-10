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
        userToken = res.body.token;
        done();
      });
  });

  describe('get /groups/search', function() {
    describe('搜索群组', function() {
      it('用户应能搜索到公开的群组(regex参数正确)', function(done) {
        request.get('/groups/search')
          .query({
            'regex': data[2].teams[0].model.name.toString()
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能搜索到公开的群组(regex参数错误)', function(done) {
        request.get('/groups/search')
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          })
      });
    });
  });
}