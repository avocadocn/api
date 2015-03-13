var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
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

    it('本队队长应能成功应战别的小队发来的挑战信', function(done) {
      var messageId = data[0].competitionMessages[0]._id;
      request.put('/competition_messages/'+messageId)
      .send({action:'accept'})
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('本队队长应能成功拒绝别的小队发来的挑战信', function(done) {
      var messageId = data[0].competitionMessages[8]._id;
      request.put('/competition_messages/'+messageId)
      .send({action:'reject'})
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('本队队长应不能应战已应战过的挑战信', function(done) {
      var messageId = data[0].competitionMessages[1]._id;
      request.put('/competition_messages/'+messageId)
      .send({action:'accept'})
      .set('x-access-token', userToken)
      .expect(400)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('非本队队长应不能应战别的小队发来的挑战信', function(done) {
      var messageId = data[0].competitionMessages[5]._id;
      request.put('/competition_messages/'+messageId)
      .send({action:'accept'})
      .set('x-access-token', userToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
    it('HR应不能应战其它小队发来的挑战信', function(done) {
      var messageId = data[0].competitionMessages[2]._id;
      request.put('/competition_messages/'+messageId)
      .send({action:'accept'})
      .set('x-access-token', hrToken)
      .expect(403)
      .end(function (err, res) {
        if (err) return done(err);
        done();
      });
    });
  });
};