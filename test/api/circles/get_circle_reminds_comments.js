var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var async = require('async');

module.exports = function () {
  var data, userToken, hrToken;
  before(function (done) {
    data = dataService.getData();
    var user = data[0].users[0];
    var company = data[0].model;
    
    async.parallel([
      function(callback) {
        request.post('/users/login')
          .send({
            email: user.email,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              callback(err);
            }
            userToken = res.body.token;
            callback();
          });
      },
      function(callback) {
        request.post('/companies/login')
          .send({
            username: company.username,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              callback(err);
            }
            hrToken = res.body.token;
            callback();
          });
      }
    ],function(err, results) {
      if(err)
        return done(err);
      done();
    })
  })
  
  describe('get /circle_reminds/comments', function () {
    it('用户不带参数应该可以获取到同事圈提醒', function (done) {
      request.get('/circle_reminds/comments')
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err,res) {
        if(err) return done(err);
        res.body.should.be.an.instanceOf(Array);
        done();
      });
    });

    it('用户带参数请求应该可以获取到同事圈提醒', function (done) {
      request.get('/circle_reminds/comments')
      .set('x-access-token', userToken)
      .query({last_comment_date: Date.now(), limit:20})
      .expect(200)
      .end(function (err,res) {
        if(err) return done(err);
        res.body.should.be.an.instanceOf(Array);
        done();
      });
    });

    it('HR应该不能获取到是否有新消息', function (done) {
      request.get('/circle_reminds/comments')
      .set('x-access-token', hrToken)
      .expect(403)
      .end(function (err,res) {
        if(err) return done(err);
        done();
      });
    });
  });
};