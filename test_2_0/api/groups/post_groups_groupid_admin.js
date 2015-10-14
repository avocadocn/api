var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var dataService = require('../../create_data');
var async = require('async');
module.exports = function () {

  describe('post /groups/:groupId/admin', function () {
    var data, userToken, userToken1;

    before(function(done) {
      data = dataService.getData();

      async.parallel([
        function(callback) {
          //大使
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
          //第一个公司的第一个人
          var user = data[2].users[1];
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
              userToken1 = res.body.token;
              callback();
            });
        }
      ], function(err, results) {
        if (err) return done(err);
        else done();
      })
    });

    describe('任命管理员', function() {
      it('非队长不可以任命管理员', function(done) {
        request.post('/groups/' + data[2].teams[0].model._id.toString()+'/admin')
          .send({'userId':data[2].users[3].id})
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
      it('队长可以任命管理员', function(done) {
        request.post('/groups/' + data[2].teams[0].model._id.toString()+'/admin')
          .send({'userId':data[2].users[3].id})
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    })
  })
};



