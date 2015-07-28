var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1;
  var circleContentIds = [];

  before(function(done) {
    data = dataService.getData();
    async.series([
      function(callback) {
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
                  return callback(err);
                }
                userToken = res.body.token;
                callback();
              });
          },
          function(callback) {
            // //第二个公司的第一个人
            var user = data[1].users[0];
            request.post('/users/login')
              .send({
                email: user.email,
                password: '55yali'
              })
              .expect(200)
              .end(function(err, res) {
                if (err) {
                  return callback(err);
                }
                userToken1 = res.body.token;
                callback();
              });
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
        for (var i = 0; i < 3; i++) {
          contents.push(chance.string({
            length: 10,
            pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
          }));
        }

        async.map(contents, function(content, callback) {
          request.post('/circle/contents')
            .field(
              'content', content
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
  });

  describe('post /circle/contents/:contentId/comments', function() {
    describe('评论或赞', function() {
      it('用户应能对所在公司同事圈消息点赞', function(done) {
        request.post('/circle/contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'appreciate',
            isOnlyToContent: true
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能对所在公司同事圈消息重复点赞', function(done) {
        request.post('/circle/contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'appreciate',
            isOnlyToContent: true
          })
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('已点赞');
            done();
          })
      });

      it('用户应能对所在公司同事圈消息发表评论', function(done) {
        request.post('/circle/contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'comment',
            content: chance.string(),
            isOnlyToContent: true
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应不能对所在公司同事圈消息发表评论或赞(若参数错误)', function(done) {
        request.post('/circle/contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'comment',
            content: chance.string(),
            isOnlyToContent: true,
            targetUserId: data[0].users[1]._id.toString()
          })
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          })
      });

      it('用户应不能对外公司同事圈消息发表发表评论或赞', function(done) {
        request.post('/circle/contents/' + circleContentIds[0] + '/comments')
          .send({
            kind: 'appreciate',
            isOnlyToContent: true
          })
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('权限错误');
            done();
          })
      });
    });
  })
}