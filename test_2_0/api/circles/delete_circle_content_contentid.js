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

  describe('delete /circle/contents/:contentId', function() {
    describe('删除已发消息', function() {
      it('用户应能删除自己在同事圈发布的消息', function(done) {
        request.delete('/circle/contents/' + circleContentIds[0])
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能删除其他用户在同事圈发布的消息', function(done) {
        request.delete('/circle/contents/' + circleContentIds[1])
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能通过非法id删除在同事圈发布的消息', function(done) {
        request.delete('/circle/contents/1')
          .set('x-access-token', userToken)
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能删除不存在的同事圈的消息', function(done) {
        request.delete('/circle/contents/0000c3fcd271b3943b2d44c9')
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