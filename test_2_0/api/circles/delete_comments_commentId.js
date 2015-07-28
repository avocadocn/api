var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1;
  var circleContentIds = [];
  var circleCommentIds = [];

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
        });
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
              callback();
            })
          
        }, function(err, results) {
          if (err) {
            callback(err);
          } else {
            callback(null, results);
          }
        })
      },
      function(callback) {
        // Generate several cirlce-comments only for one circle-content
        var comments = [];
        for (var i = 0; i < 10; i++) {
          comments.push({
            kind: 'comment',
            content: chance.string(),
            isOnlyToContent: true
          });
        }
        async.map(comments, function(comment, callback) {
          request.post('/circle/contents/' + circleContentIds[0] + '/comments')
            .send(comment)
            .set('x-access-token', userToken)
            .expect(200)
            .end(function(err, res) {
              circleCommentIds.push(res.body.circleComment._id.toString());
              callback(err, res);
            })
        }, function(err, results) {
          callback(err, results);
        })

      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    });
  });

  describe('delete /circle/comments/:commentId', function() {
    describe('撤消评论或取消赞', function() {
      it('用户应能删除自己的同事圈评论', function(done) {
        request.delete('/circle/comments/' + circleCommentIds[0])
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能删除其他用户同事圈评论', function(done) {
        request.delete('/circle/comments/' + circleCommentIds[1])
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('权限错误');
            done();
          })
      });

      it('用户不能删除不存在的同事圈评论', function(done) {
        request.delete('/circle/comments/0000c3fcd271b3943b2d44c9')
          .set('x-access-token', userToken)
          .expect(204)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

    });
  })
}