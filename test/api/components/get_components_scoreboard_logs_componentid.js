'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('get /components/ScoreBoard/logs/:componentId', function() {
    describe('用户获取比分记录', function() {
      var accessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var user = data[2].teams[0].leaders[0];
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
      it('应该成功获取比分记录', function(done) {
        var campaign = data[2].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.get('/components/ScoreBoard/logs/' + scoreBoardId)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.should.be.instanceof(Array).and.have.lengthOf(0);
            done();
          });
      });
      it('获取没有权限的比分记录应该返回403', function(done) {
        var campaign = data[1].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.get('/components/ScoreBoard/logs/' + scoreBoardId)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有此权限');
            done();
          });
      });
      it('获取不正确id的比分记录应该返回403', function(done) {
        request.get('/components/ScoreBoard/logs/111')
          .set('x-access-token', accessToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          });
      });
    });
    describe('hr获取比分记录', function() {
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
      it('应该成功获取比分记录', function(done) {
        var campaign = data[2].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.get('/components/ScoreBoard/logs/' + scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.should.be.instanceof(Array).and.have.lengthOf(0);
            done();
          });
      });
      it('获取没有权限的比分记录应该返回403', function(done) {
        var campaign = data[1].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.get('/components/ScoreBoard/logs/' + scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有此权限');
            done();
          });
      });
      it('获取不正确id的比分记录应该返回403', function(done) {
        request.get('/components/ScoreBoard/logs/111')
          .set('x-access-token', hrAccessToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          });
      });
    });
  });
};