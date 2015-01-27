'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('put /components/ScoreBoard/:componentId', function() {

    describe('用户确认比分', function() {
      var accessToken =[];
      var data;
      before(function (done) {
        data = dataService.getData();
        var firstTeamLeader = data[0].teams[0].leaders[0];
        var secondTeamLeader = data[0].teams[1].leaders[0];
        var user = data[0].users[3];
        request.post('/users/login')
          .send({
            email: user.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              accessToken[2] = res.body.token;
            }
          });
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
              //将第一个公司第二个队的第二个活动设置比分
              var campaign = data[0].teams[1].campaigns[1];
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
                .end(function(err, res) {
                  if (err) return done(err);
                  done();
                });
            });
          });

      });
      it('确认没有设置的比分应该返回400', function(done) {
        var campaign = data[0].teams[1].campaigns[2];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('比分没有设置。');
            done();
          });
      });
      it('确认自己设置的比分应该返回403', function(done) {
        var campaign = data[0].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有确认该比分的权限');
            done();
          });
      });
      it('确认未开始的比赛的比分应该返回400', function(done) {
        var campaign = data[0].teams[1].campaigns[0];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('比分没有设置。');
            done();
          });
      });
      //没有生成相应数据
      it.skip('确认已经关闭的比赛的比分应该返回400', function(done) {
        var campaign = data[0].teams[1].campaigns[3];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动已经关闭');
            done();
          });
      });

      it('设置不存在的比分组件应该返回404', function(done) {
        var campaign = data[0].teams[1].campaigns[1];
        request.put('/components/ScoreBoard/111')
          .set('x-access-token', accessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          });
      });
      it('确认没有权限的比分组件应该返回403', function(done) {
        var campaign = data[0].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/'+scoreBoardId)
          .set('x-access-token', accessToken[2])
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有确认该比分的权限');
            done();
          });
      });
      it('确认比分应该成功', function(done) {
        var campaign = data[0].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[1])
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          });
      });
      it('重复确认比分应该返回400', function(done) {
        var campaign = data[0].teams[1].campaigns[1];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', accessToken[1])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('比分已确认。');
            done();
          });
      });
      
    });

    describe('hr设置比分', function() {
      var hrAccessToken =[];
      var data;
      before(function (done) {
        data = dataService.getData();
        var hrOne = data[0].model;
        var hrTwo = data[1].model;
        request.post('/companies/login')
        .send({
          username: hrTwo.username,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            hrAccessToken[1] = res.body.token;
          }
        });
        request.post('/companies/login')
          .send({
            username: hrOne.username,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              hrAccessToken[0] = res.body.token;
              //先将第一个公司与第二个公司的正在进行的挑战设置比分
              var campaign = data[0].teams[0].campaigns[9];
              var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
              request.post('/components/ScoreBoard/' + scoreBoardId)
                .set('x-access-token', hrAccessToken[0])
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
            }
          });

      });
      it('确认没有设置的比分应该返回400', function(done) {
        var campaign = data[0].teams[0].campaigns[10];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('比分没有设置。');
            done();
          });
      });
      it('确认自己设置的比分应该返回403', function(done) {
        var campaign = data[0].teams[0].campaigns[9];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken[0])
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有确认该比分的权限');
            done();
          });
      });
      it('确认未开始的比赛的比分应该返回400', function(done) {
        var campaign = data[0].teams[0].campaigns[8];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('比分没有设置。');
            done();
          });
      });
      //没有生成相应数据
      it.skip('确认已经关闭的比赛的比分应该返回400', function(done) {
        var campaign = data[0].teams[0].campaigns[11];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动已经关闭');
            done();
          });
      });
      it('确认没有权限的比分组件应该返回403', function(done) {
        var campaign = data[0].teams[0].campaigns[9];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/'+scoreBoardId)
          .set('x-access-token', hrAccessToken[0])
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有确认该比分的权限');
            done();
          });
      });
      it('设置不存在的比分组件应该返回404', function(done) {
        request.put('/components/ScoreBoard/111')
          .set('x-access-token', hrAccessToken[0])
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数错误');
            done();
          });
      });
      it('确认比分应该成功', function(done) {
        var campaign = data[0].teams[0].campaigns[9];
        var scoreBoardId = campaign.components[0].name=='ScoreBoard' ?campaign.components[0].id :campaign.components[1].id;
        request.put('/components/ScoreBoard/' + scoreBoardId)
          .set('x-access-token', hrAccessToken[1])
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          });
      });
    });
  });
};



