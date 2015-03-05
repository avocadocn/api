var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function () {
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
  
  describe('get /circle_reminds', function () {
    it('用户应该可以获取到是否有新消息', function (done) {
      request.get('/circle_reminds')
      .set('x-access-token', userToken)
      .query({has_new:true})
      .expect(200)
      .end(function (err,res) {
        if(err) return done(err);
        res.body.reminds.number.should.be.a.Number;
        done();
      });
    });

    it('当参数错误应该不能获取', function (done) {
      request.get('/circle_reminds')
      .set('x-access-token', userToken)
      .expect(422)
      .end(function (err,res) {
        if(err) return done(err);
        done();
      });
    });

    it('HR应该不能获取到是否有新消息', function (done) {
      request.get('/circle_reminds')
      .set('x-access-token', hrToken)
      .query({has_new:true})
      .expect(403)
      .end(function (err,res) {
        if(err) return done(err);
        done();
      });
    });
  });
};