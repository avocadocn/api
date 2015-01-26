'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function() {
  describe('post /teams', function() {

    describe('hr创建小队', function () {
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
      it('应该成功创建一个小队', function (done) {
        var teamData = {
          companyId: data[2].model.id,
          selectedGroups: [
            {
              "groupType": "阅读",
              "teamName": chance.string({length:10}),
              "entityType": "Reading",
              "_id": "3"
            }
          ]
        }
        request.post('/teams')
          .send(teamData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.property('teamId');
            console.log(res.body.teamId);
            res.body.msg.should.have.equal("保存成功");
            done();
          });
      });
      it('应该成功创建多个小队', function (done) {
        var teamData = {
          companyId: data[2].model.id,
          selectedGroups: [
            {
              "groupType": "阅读",
              "teamName": chance.string({length:10}),
              "entityType": "Reading",
              "_id": "3"
            },
            {
              "groupType": "足球",
              "teamName": chance.string({length:10}),
              "entityType": "FootBall",
              "_id": "7"
            },
            {
              "groupType": "阅读",
              "teamName": chance.string({length:10}),
              "entityType": "Reading",
              "_id": "3"
            }
          ]
        }
        request.post('/teams')
          .send(teamData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.property('teamId');
            res.body.msg.should.have.equal("保存成功");
            done();
          });
      });
      it('应该成功创建未命名小队', function (done) {
        var teamData = {
          companyId: data[2].model.id,
          selectedGroups: [
            {
              "groupType": "阅读",
              "entityType": "Reading",
              "_id": "3"
            }
          ]
        }
        request.post('/teams')
          .send(teamData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.property('teamId');
            res.body.msg.should.have.equal("保存成功");
            done();
          });
      });
      it('创建不含公司ID小队应该返回200', function (done) {
        var teamData = {
          selectedGroups: [
            {
              "groupType": "阅读",
              "entityType": "Reading",
              "_id": "3"
            }
          ]
        }
        request.post('/teams')
          .send(teamData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
                        res.body.should.have.property('teamId');
            res.body.msg.should.have.equal("保存成功");
            done();
          });
      });
      it('创建其他公司小队应该返回403', function (done) {
        var teamData = {
          companyId: data[1].model.id,
          selectedGroups: [
            {
              "groupType": "阅读",
              "entityType": "Reading",
              "_id": "3"
            }
          ]
        }
        request.post('/teams')
          .send(teamData)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.have.equal("权限错误");
            done();
          });
      });
      it('创建不正确id的公司的小队时应该返回400', function (done) {
        var teamData = {
          companyId: 'sss',
          selectedGroups: [
            {
              "groupType": "阅读",
              "entityType": "Reading",
              "_id": "3"
            }
          ]
        }
        request.post('/teams')
          .send(teamData)
          .set('x-access-token', hrAccessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.have.equal("参数不正确");
            done();
          });
      });

    });
    describe('用户创建小队', function () {
      var accessToken;

      before(function (done) {
        var data = dataService.getData();
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

    });
    
  });
}