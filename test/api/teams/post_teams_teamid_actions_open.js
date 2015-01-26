'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var chance = require('chance').Chance();
var dataService = require('../../create_data');

module.exports = function() {
  describe('delete /teams/:teamId', function() {

    describe('用户关闭小队', function () {
      var accessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var user = data[2].users[0];
        request.post('/users/login')
          .send({
            email: user.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              accessToken = res.body.token;
            }
            done();
          });

      });
      it('用户关闭小队应该返回403', function (done) {
        var team = data[2].teams[0].model;
        request.delete('/teams/'+team.id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('权限错误');
            done();
          });
      });
    });
    describe('hr修改小队信息', function () {
      var hrAccessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var hr = data[2].model;
        request.post('/companies/login')
          .send({
            username: hr.username,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              hrAccessToken = res.body.token;
            }
            done();
          });
      });
      it('hr成功关闭公司小队', function (done) {
        var team = data[2].teams[0].model;
        request.delete('/teams/'+team.id)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('成功');
            done();
          });
      });
      it('hr修改其他公司小队名应该返回403', function (done) {
        var team = data[1].teams[0].model;
        request.delete('/teams/'+team.id)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('权限错误');
            done();
          });
      });

    });
  });
};





