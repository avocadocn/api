var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, hrToken;

  before(function(done) {
    data = dataService.getData();

    async.parallel([
      function(callback) {
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
              console.log(res.body);
              return done(err);
            }
            userToken = res.body.token;
            callback();
          });
      },
      function(callback) {
        //第一个公司的hr
        var company = data[0].model;
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
            hrToken = res.body.token;
            callback();
          })
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    })
  })

  describe('post /circle_contents', function() {
    describe('本公司成员', function() {
      it('本公司用户应能发表带字无图评论', function(done) {
        request.post('/circle_contents')
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

      it('本公司用户应能发表带图无字评论', function(done) {
        request.post('/circle_contents')
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('本公司用户应能发表带图有字评论', function(done) {
        request.post('/circle_contents')
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

      it('本公司用户应能发表无图无字评论', function(done) {
        request.post('/circle_contents')
          .set('x-access-token', userToken)
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('本公司用户应不能上传非图像文件', function(done) {
        request.post('/circle_contents')
          .attach('photo', __dirname + '/test_photo.txt')
          .set('x-access-token', userToken)
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
    describe('hr', function() {
      it('hr应不能发表评论', function(done) {
        request.post('/circle_contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .set('x-access-token', hrToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
  })
}