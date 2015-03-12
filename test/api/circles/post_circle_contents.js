var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1, hrToken;

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
        //第一个公司的第一个人
        var user = data[1].users[0];
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
            userToken1 = res.body.token;
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
      it('用户应能在所参加活动中发表带字无图帖子', function(done) {
        request.post('/circle_contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .field(
            'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
          )
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应能在所参加活动中发表带图无字帖子', function(done) {
        request.post('/circle_contents')
          .field(
            'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
          )
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应能在所参加活动中发表带图有字帖子', function(done) {
        request.post('/circle_contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .field(
            'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
          )
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能在未参加活动中发帖子', function(done) {
        request.post('/circle_contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .field(
            'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
          )
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能发表无图无字帖子', function(done) {
        request.post('/circle_contents')
          .field(
            'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
          )
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能发表帖子(若无活动id参数)', function(done) {
        request.post('/circle_contents')
          .field(
            'content', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          })
      });
      it('用户应不能上传非图像文件', function(done) {
        request.post('/circle_contents')
          .field(
            'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
          )
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
    describe('hr', function() {
      it('hr应不能在同事圈发表帖子', function(done) {
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