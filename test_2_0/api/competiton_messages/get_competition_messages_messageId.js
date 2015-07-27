var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function () {
  describe('put /competition_messages/:messageId', function () {
    var userToken;
    var hrToken;
    var data;
    before(function(done) {
      data = dataService.getData();
      async.parallel([
        function(callback) {
          var user = data[0].teams[0].leaders[0];
          request.post('/users/login')
          .send({
            email: user.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              userToken = res.body.token;
            }
            callback();
          });
        },
        function(callback){
          var company = data[0].model;
          request.post('/companies/login')
            .send({
              username: company.username,
              password: '55yali'
            })
            .expect(200)
            .end(function (err, res) {
              if(err) {
                console.log(res.body);
                return done(err);
              }
              hrToken = res.body.token;
              callback();
            })
          }
      ],function(err, results) {
        if(err) return done(err);
        else done();
      })
    });

    it('本队成员应能成功获取别的小队发来的挑战信详情', function(done) {
      var messageId = data[0].competitionMessages[0]._id;
      request.get('/competition_messages/'+messageId)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('非本队成员应能不能获取别的小队发来的挑战信详情', function(done) {
      var messageId = data[0].competitionMessages[5]._id;
      request.get('/competition_messages/'+messageId)
      .set('x-access-token', userToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('HR应不能获取挑战信详情', function(done) {
      var messageId = data[0].competitionMessages[0]._id;
      request.get('/competition_messages/'+messageId)
      .set('x-access-token', hrToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
  });
};