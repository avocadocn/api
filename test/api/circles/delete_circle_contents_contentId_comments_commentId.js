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
      if (err) return done(err);
      else done();
    })
  })

  describe('delete /circle_contents/:contentId/comments/:commentId', function() {
    describe('本公司成员', function() {
      it('本公司用户应能删除自己的朋友圈评论', function(done) {
        request.delete('/circle_contents/:contentId/comments/' + data[0].circles[0].comments[0]._id)
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('本公司用户不能删除其他用户朋友圈评论', function(done) {
        request.delete('/circle_contents/:contentId/comments/' + data[0].circles[1].comments[0]._id)
          .set('x-access-token', userToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('本公司用户不能删除其他公司用户朋友圈消息', function(done) {
        request.delete('/circle_contents/:contentId/comments/' + data[1].circles[0].comments[0]._id)
          .set('x-access-token', userToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
    describe('hr', function() {
      it('hr没有删除朋友圈消息功能', function(done) {
        request.delete('/circle_contents/:contentId/comments/' + data[0].circles[0].comments[0]._id)
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