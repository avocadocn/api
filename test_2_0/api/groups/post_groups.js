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

  describe('post /groups', function() {
    describe('新建群组', function() {
      it('用户建立新群组(参数正确)', function(done) {
        request.post('/groups')
          .field(
            'name', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .field(
            'themeColor', chance.color()
          )
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能建立新群组(缺少参数)', function(done) {
        request.post('/groups')
          .field(
            'name', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .field(
            'themeColor', chance.color()
          )
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
  });
}