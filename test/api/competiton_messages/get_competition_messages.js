var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
var async = require('async');
module.exports = function () {
  describe('get /competition_messages', function () {
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

    var getMessagesSuccessTest = function(theme, index) {
      var title = util.format('个人应能获取自己参加的%s的挑战日志', theme)
      it(title, function(done) {
        switch(index) {
          case 1:
            var queryData = {messageType: 'sponsor'};
            break;
          case 2:
            var queryData = {messageType: 'receive'};
            break;
          case 3:
            var queryData = {sponsor: data[0].teams[0].model.id};
            break;
          case 4:
            var queryData = {opposite: data[0].teams[0].model.id};
            break;
        }
        request.get('/competition_messages')
        .query(queryData)
        .set('x-access-token', userToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
      });
    };
    getMessagesSuccessTest('所有小队发出', 1);
    getMessagesSuccessTest('所有小队收到', 2);
    getMessagesSuccessTest('某小队发出',3);
    getMessagesSuccessTest('某小队收到',4);

    it('个人应不能获取自己未参加的小队的挑战日志', function(done){
      var queryData = {sponsor: data[0].teams[2].model._id};
      request.get('/competition_messages')
      .query(queryData)
      .set('x-access-token', userToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });

    it('HR应不能查看挑战日志', function(done) {
      var queryData = {sponsor: data[0].teams[0].model._id};
      request.get('/competition_messages')
      .query(queryData)
      .set('x-access-token', hrToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
  });
};