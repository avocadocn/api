var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1, hrToken;
  var circleContentIds = [];
  var circleComments = [];
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
            var user = data[0].users[1];
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
        async.series([
            function(callback) {
              var comments = [];
              for (var i = 0; i < 2; i++) {
                comments.push({
                  kind: 'comment',
                  content: chance.string(),
                  isOnlyToContent: true,
                  userToken: i % 2 == 0 ? userToken : userToken1
                });
              }
              async.map(comments, function(comment, callback) {
                  request.post('/circle/contents/' + circleContentIds[0] + '/comments')
                    .send(comment)
                    .set('x-access-token', comment.userToken)
                    .expect(200)
                    .end(function(err, res) {
                      circleComments.push(res.body.circleComment);
                      callback(err, res);
                    })
                }, function(err, results) {
                  callback(err, results);
                })
            },
            function(callback) {
              // Generate several cirlce-comments only for one circle-content
              var comments = [];
              for (var i = 0; i < 10; i++) {
                comments.push({
                  kind: 'appreciate',
                  isOnlyToContent: true,
                  userToken: i % 2 == 0 ? userToken : userToken1
                });
              }

              async.map(comments, function(comment, callback) {
                  request.post('/circle/contents/' + circleContentIds[0] + '/comments')
                    .send(comment)
                    .set('x-access-token', comment.userToken)
                    .expect(200)
                    .end(function(err, res) {
                      circleComments.push(res.body.circleComment);
                      callback(err, res);
                    })
                }, function(err, results) {
                  callback(err, results);
                })
            }
          ],
          // optional callback
          function(err, results) {
            callback();
          });

      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    });
  })

  describe('get /circle/reminds/comments', function() {
    it('用户应不能未带参数获取到公司同事圈提醒', function(done) {
      request.get('/circle/reminds/comments')
        .set('x-access-token', userToken)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('用户带参数请求应该可以获取到公司同事圈提醒', function(done) {
      request.get('/circle/reminds/comments')
        .set('x-access-token', userToken)
        .query({
          last_comment_date: circleComments[0].postDate.toString()
        })
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR应该不能获取到是否有新消息', function(done) {
      request.get('/circle/reminds/comments')
        .set('x-access-token', hrToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
  });
};