'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('get /teams/:teamId', function() {

    describe('用户获取单个小队', function () {
      var accessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var user = data[0].users[0];
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

      it('个人获取小队应该返回200', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/'+team.id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body._id.should.equal(team.id);
            done();
          });
      });

      it('个人获取其他公司小队应该返回403', function (done) {
        var team = data[1].teams[0].model;
        request.get('/teams/'+team.id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('权限错误');
            done();
          });
      });
      it('个人获取id不正确的小队应该返回404', function (done) {
        var team = data[1].teams[0].model;
        request.get('/teams/sss')
          .set('x-access-token', accessToken)
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有找到对应的小队');
            done();
          });
      });
    });
    describe('hr获取小队', function () {
      var hrAccessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var hr = data[0].model;
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
      it('hr获取小队应该返回200', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/'+team.id)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body._id.should.equal(team.id);
            done();
          });
      });

      it('hr获取其他公司小队应该返回403', function (done) {
        var team = data[1].teams[0].model;
        request.get('/teams/'+team.id)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('权限错误');
            done();
          });
      });
      it('hr获取id不正确的小队应该返回404', function (done) {
        request.get('/teams/ss')
          .set('x-access-token', hrAccessToken)
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有找到对应的小队');
            done();
          });
      });
    });
  });
};



