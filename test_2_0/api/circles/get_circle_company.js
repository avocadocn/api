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
                phone: user.phone,
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
                phone: user.phone,
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

  describe('get /circle/company', function() {
    describe('获取公司消息及评论', function() {
      it('用户应能不带参数获取同事圈', function(done) {
        request.get('/circle/company')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应能刷新同事圈', function(done) {
        request.get('/circle/company')
          .query({
            latestContentDate: Date.now() - 3600000
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户应能获取下一页同事圈', function(done) {
        request.get('/circle/company')
          .query({
            lastContentDate: Date.now(),
            limit: 20
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能同时使用参数latestContentDate和lastContentDate', function(done) {
        request.get('/circle/company')
          .query({
            latestContentDate: Date.now() - 3600000,
            lastContentDate: Date.now(),
            limit: 20
          })
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          })
      });

      it('用户获取到最新同事圈消息应为空(无新同事圈消息时)', function(done) {
        request.get('/circle/company')
          .query({
            latestContentDate: Date.now()
          })
          .set('x-access-token', userToken)
          .expect(204)
          .end(function(err, res) {
            if (err) return done(err);
            console.log(res.body);
            // res.body.msg.should.equal('未找到同事圈消息');
            done();
          })
      });
    });
  })
}