var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1, hrToken;
  var circleContents = [];
  var circleCommentIds = [];

  before(function(done) {
    data = dataService.getData();
    async.series([
      function(callback) {
        async.parallel([
          function(callback) {
            var user = data[2].users[0];
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
                userToken1 = res.body.token;
                callback();
              });
          },
          function(callback) {
            var company = data[2].model;
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
              'campaign_id', data[2].teams[0].campaigns[0]._id.toString()
            )
            .set('x-access-token', userToken)
            .expect(200)
            .end(function(err, res) {
              if(err) console.log(err);
              circleContents.push(res.body.circleContent);
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
          request.post('/circle_contents/' + circleContents[0]._id.toString() + '/comments')
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
  })

  describe('get /circle/personal', function() {
    describe('本公司成员', function() {
      it('用户应能不带参数获取同事圈', function(done) {
        request.get('/circle/personal')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
      it('用户应能刷新同事圈', function(done) {
        request.get('/circle/personal')
          .query({
            latest_content_date: circleContents[0].post_date.toString(),
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
      it('用户应能获取下一页同事圈', function(done) {
        request.get('/circle/personal')
          .query({
            last_content_date: Date.now(),
            limit: 20
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
    describe('hr', function() {
      it('hr应不能获取公司同事圈', function(done) {
        request.get('/circle/personal')
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