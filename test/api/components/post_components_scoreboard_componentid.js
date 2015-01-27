'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('post /components/ScoreBoard/:componentId', function() {

    describe('用户设置比分', function() {
      var accessToken =[];
      var data;
      before(function (done) {
        data = dataService.getData();
        var firstTeamLeader = data[2].teams[0].leaders[0];
        var secondTeamLeader = data[2].teams[1].leaders[0];
        request.post('/users/login')
          .send({
            email: firstTeamLeader.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              accessToken[0] = res.body.token;

            }
            request.post('/users/login')
            .send({
              email: secondTeamLeader.email,
              password: '55yali'
            })
            .end(function (err, res) {
              if (err) return done(err);
              if (res.statusCode === 200) {
                accessToken[1] = res.body.token;
              }
              done();
            });
          });

      });
      it('修改比分不发送数据应该返回400', function(done) {
        var campaign = data[2].teams[1].campaigns[2];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('data不能为空');
            done();
          });
      });
      it('应该成功设置比分', function(done) {
        var campaign = data[2].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          });
      });
      it('修改自己设置的比分应该成功', function(done) {
        var campaign = data[2].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                5,1
              ],
              "results": [
                1,-1
              ]
            }
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          });
      });
      it('重复设置比分应该返回500', function(done) {
        var campaign = data[2].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('对方已设置了比分，请刷新页面进行确认。');
            done();
          });
      });
      it('修改已经设置的比分应该成功', function(done) {
        var campaign = data[2].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[1])
          .send({
            "data": {
              "scores": [
                1,5
              ],
              "results": [
                -1,1
              ]
            }
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          });
      });
      it('设置未开始的比赛的比分应该返回400', function(done) {
        var campaign = data[2].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动还未开始，无法设置比分');
            done();
          });
      });
      it('设置关闭的比赛的比分应该返回400', function(done) {
        var campaign = data[2].teams[1].campaigns[3];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动已经关闭');
            done();
          });
      });
      it('设置没有权限的比分组件应该返回403', function(done) {
        var campaign = data[1].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/'+scoreBoardId)
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有此权限');
            done();
          });
      });
      it('设置不存在的比分组件应该返回404', function(done) {
        var campaign = data[2].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/111')
          .set('x-access-token', accessToken[0])
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          });
      });
    });

    describe('hr设置比分', function() {
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
              done();
            }
          });

      });
      it('修改比分不发送数据应该返回400', function(done) {
        var campaign = data[2].teams[1].campaigns[2];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('data不能为空');
            done();
          });
      });
      it('应该成功设置比分', function(done) {
        var campaign = data[2].teams[1].campaigns[2];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          });
      });
      it('修改已经确认的比分应该返回500', function(done) {
        var campaign = data[2].teams[1].campaigns[2];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .send({
            "data": {
              "scores": [
                5,1
              ],
              "results": [
                1,-1
              ]
            }
          })
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('抱歉，比分已确认，不可以再设置。');
            done();
          });
      });
      it('设置未开始的比赛的比分应该返回400', function(done) {
        var campaign = data[2].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动还未开始，无法设置比分');
            done();
          });
      });
      it('设置没有权限的比分组件应该返回403', function(done) {
        var campaign = data[0].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/'+scoreBoardId)
          .set('x-access-token', hrAccessToken)
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有此权限');
            done();
          });
      });
      it('设置不存在的比分组件应该返回404', function(done) {
        var campaign = data[2].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.post('/components/ScoreBoard/111')
          .set('x-access-token', hrAccessToken)
          .send({
            "data": {
              "scores": [
                1,0
              ],
              "results": [
                1,-1
              ]
            },
            "isInit": true
          })
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