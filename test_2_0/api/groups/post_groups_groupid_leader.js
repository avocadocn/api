var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var dataService = require('../../create_data');
var async = require('async');
module.exports = function () {

  describe('post /groups/:groupId/leader', function () {
    var data, adminToken,adminToken1, userToken;

    before(function(done) {
      data = dataService.getData();

      async.parallel([
        function(callback) {
          //大使
          var user = data[2].users[5];
          request.post('/users/login')
            .send({
              phone: user.phone,
              password: '55yali'
            })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                console.log(res.body);
                return done(err);
              }
              adminToken = res.body.token;
              callback();
            });
        },
        function(callback) {
          //第三个公司的第一个人
          var user = data[2].users[0];
          request.post('/users/login')
            .send({
              phone: user.phone,
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
          //第二个公司的大使
          var user = data[1].users[5];
          request.post('/users/login')
            .send({
              phone: user.phone,
              password: '55yali'
            })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                console.log(res.body);
                return done(err);
              }
              adminToken1 = res.body.token;
              callback();
            });
        }
      ], function(err, results) {
        if (err) return done(err);
        else done();
      })
    });

    describe('任命队长', function() {
      it('大使可以任命队长', function(done) {
        request.post('/groups/' + data[2].teams[6].model._id.toString()+'/leader')
          .send({'userId':data[2].users[1].id})
          .set('x-access-token', adminToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('非大使不可以任命队长', function(done) {
        request.post('/groups/' + data[2].teams[0].model._id.toString()+'/leader')
          .send({'userId':data[2].users[1].id})
          .set('x-access-token', userToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
      it('大使不可以任命其他学校队长', function(done) {
        request.post('/groups/' + data[2].teams[0].model._id.toString()+'/leader')
          .send({'userId':data[2].users[1].id})
          .set('x-access-token', adminToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    })
  })
};