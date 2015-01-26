'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var chance = require('chance').Chance();
var dataService = require('../../create_data');

module.exports = function() {
  describe('get /teams/:teamId', function() {

    describe('用户修改小队信息', function () {
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
      var editTeamTest = function (msg, teamData, expectStatus, expectMsg) {
        it(msg, function (done) {
          var team = data[0].teams[0].model;
          var user = data[0].users[1];
          if(teamData.leader) {
            teamData.leader = {
              _id: user.id,
              nickname:user.nickname,
              photo:user.photo
            }
          }
          request.put('/teams/'+team.id)
            .set('x-access-token', accessToken)
            .send(teamData)
            .expect(expectStatus)
            .end(function (err, res) {
              if (err) return done(err);
              if(expectStatus==200){
                res.body.msg.should.equal('成功')
              }
              else {
                res.body.msg.should.equal(expectMsg)
              }
              done();
            });
        });
      };
      var _homeCourts = [{  name: chance.string({length:10}),
                            loc: {
                              coordinates : [chance.longitude(), chance.latitude()]
                            }
                        }];
      editTeamTest('用户成功修改小队名',{name:chance.string({length:10})},200);
      editTeamTest('用户成功修改小队简介',{brief:chance.string({length:30})},200);
      editTeamTest('用户成功修改小队主场',{homeCourts:_homeCourts},200);
      editTeamTest('用户修改队长',{leader:1},403,'权限错误');
      it('用户修改其他小队名应该返回403', function (done) {
        var team = data[0].teams[1].model;
        request.put('/teams/'+team.id)
          .set('x-access-token', accessToken)
          .send({name:chance.string({length:10})})
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
      var editTeamTest = function (msg, teamData, expectStatus, expectMsg) {
        it(msg, function (done) {
          var team = data[0].teams[0].model;
          var user = data[0].users[1];
          if(teamData.leader) {
            var team = data[0].teams[2].model;
            teamData.leader = {
              _id: user.id,
              nickname:user.nickname,
              photo:user.photo
            }
          }
          request.put('/teams/'+team.id)
            .set('x-access-token', hrAccessToken)
            .send(teamData)
            .expect(expectStatus)
            .end(function (err, res) {
              if (err) return done(err);
              if(expectStatus==200){
                res.body.msg.should.equal('成功')
              }
              else {
                res.body.msg.should.equal(expectMsg)
              }
              done();
            });
        });
      };
      var _homeCourts = [{  name: chance.string({length:10}),
                            loc: {
                              coordinates : [chance.longitude(), chance.latitude()]
                            }
                        }];
      editTeamTest('hr成功修改小队名',{name:chance.string({length:10})},200);
      editTeamTest('hr成功修改小队简介',{brief:chance.string({length:30})},200);
      editTeamTest('hr成功修改小队主场',{homeCourts:_homeCourts},200);
      editTeamTest('hr成功修改队长',{leader:1},200);
      it('hr修改其他公司小队名应该返回403', function (done) {
        var team = data[1].teams[0].model;
        request.put('/teams/'+team.id)
          .set('x-access-token', hrAccessToken)
          .send({name:chance.string({length:10})})
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



