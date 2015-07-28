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
    //第一个公司的第一个人
    var user = data[0].users[0];
    request.post('/users/login')
      .send({
        email: user.email,
        password: '55yali'
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          return done(err);
        }
        userToken = res.body.token;
        done();
      });
  });

  describe('post /circle/contents', function() {
    describe('发新同事圈', function() {
      it('用户应能发表带字无图帖子', function(done) {
        request.post('/circle/contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应能发表带图无字帖子', function(done) {
        request.post('/circle/contents')
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应能发表带图有字帖子', function(done) {
        request.post('/circle/contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能发表无图无字帖子', function(done) {
        request.post('/circle/contents')
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能上传非图像文件', function(done) {
        request.post('/circle/contents')
          .attach('photo', __dirname + '/test_photo.txt')
          .set('x-access-token', userToken)
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('服务器错误');
            done();
          })
      });
    });
  })
}