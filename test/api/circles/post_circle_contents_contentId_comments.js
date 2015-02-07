var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, hrToken;

  before(function(done) {
    data = dataService.getData();

    async.parallel([
      function(callback) {
        //第一个公司的第一个人
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
        //第一个公司的hr
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
      if (err) return done(err);
      else done();
    })
  })

  describe('post /circle_contents/:contentId/comments', function() {
    describe('本公司成员', function() {
      it('本公司用户应能对本公司朋友圈消息发表评论', function(done) {
        request.post('/circle_contents/' + data[2].circles[0].content._id + '/comments')
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

      it('本公司用户应能对本公司朋友圈的评论发表评论', function(done) {
        request.post('/circle_contents/' + data[2].circles[0].content._id + '/comments')
          .send({
            kind: 'comment',
            content: chance.string(),
            is_only_to_content: false,
            target_user_id: data[2].circles[0].comments[0].post_user_id
          })
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('本公司用户不能对其他公司朋友圈消息发表评论', function(done) {
        request.post('/circle_contents/' + data[0].circles[1].content._id + '/comments')
          .send({
            kind: 'appreciate',
            is_only_to_content: true
          })
          .set('x-access-token', userToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
    describe('hr', function() {
      it('hr无朋友圈发评论功能', function(done) {
        request.post('/circle_contents/' + data[2].circles[0].content._id + '/comments')
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