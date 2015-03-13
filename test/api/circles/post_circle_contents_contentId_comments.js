var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1, hrToken;
  var circleContentIds = [];

  before(function(done) {
    data = dataService.getData();
    async.series([
      function(callback) {
        async.parallel([
          function(callback) {
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
          if (err) {
            callback(err);
          } else {
            callback(null, results);
          }

        })
      },
      function(callback) {
        // Generate several circle-contents and store these into circleContentIds
        var contents = [];
        for (var i = 0; i < 6; i++) {
          contents.push(chance.string({
            length: 10,
            pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
          }));
        }

        async.map(contents, function(content, callback) {
          request.post('/circle_contents')
            .field(
              'content', content
            )
            .field(
              'campaign_id', data[0].teams[0].campaigns[0]._id.toString()
            )
            .set('x-access-token', userToken)
            .expect(200)
            .end(function(err, res) {
              circleContentIds.push(res.body.circleContent._id.toString());
            })
            callback();
        }, function(err, results) {
          if(err) {
            callback(err);
          } else {
            callback(null, results);
          }
        })
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    });
  })

  describe('post /circle_contents/:contentId/comments', function() {
    describe('公司成员', function() {
      it('用户应能对自己公司所参加活动的帖子点赞', function(done) {
        request.post('/circle_contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'appreciate',
            is_only_to_content: true
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能对自己公司所参加活动的帖子重复点赞', function(done) {
        request.post('/circle_contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'appreciate',
            is_only_to_content: true
          })
          .set('x-access-token', userToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('已点赞');
            done();
          })
      });

      it('用户应能对自己公司所参加活动的帖子发表评论', function(done) {
        request.post('/circle_contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'comment',
            content: chance.string(),
            is_only_to_content: true
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能对自己公司所参加活动的帖子发表评论或赞(若参数错误)', function(done) {
        request.post('/circle_contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'comment',
            content: chance.string(),
            is_only_to_content: true,
            target_user_id: data[0].users[1]._id.toString()
          })
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          })
      });
      it('用户应不能对公司未参加的活动的帖子发表评论或赞', function(done) {
        request.post('/circle_contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'appreciate',
            is_only_to_content: true
          })
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
    describe('hr', function() {
      it('hr无同事圈发评论功能', function(done) {
        request.post('/circle_contents/' + circleContentIds[0] + '/comments')
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