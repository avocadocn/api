var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1, hrToken;
  var circleContentIds = [];
  var circleCommentIds = [];
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
            is_only_to_content: true
          });
        }
        async.map(comments, function(comment, callback) {
          request.post('/circle_contents/' + circleContentIds[0] + '/comments')
            .send(comment)
            .set('x-access-token', userToken1)
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
  })

  describe('delete /circle_reminds/comments', function() {
    describe('本公司成员', function() {
      it('本公司用户应能删除消息列表中的指定消息', function(done) {
        request.delete('/circle_reminds/comments')
          .query({
            commentId: circleCommentIds[0]
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('本公司用户应能删除消息列表', function(done) {
        request.delete('/circle_reminds/comments')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

    });
    describe('hr', function() {
      it('hr没有删除消息列表功能', function(done) {
        request.delete('/circle_reminds/comments')
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