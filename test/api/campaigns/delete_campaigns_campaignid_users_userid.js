var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('delete /campaigns/:campaignId/user/userId', function () {

    var data;
    describe('用户退出活动', function () {
        var accessToken;
        before(function (done) {
          data = dataService.getData();
          var user = data[1].teams[0].users[0];
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
        it('应该成功退出活动', function (done) {
          var campaign = data[1].teams[0].campaigns[0];
          var user = data[1].teams[0].users[0];
          request.delete('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.members_count.should.equal(0);
              done();
            });
        });
        it('退出未参加过的活动应该返回400', function (done) {
          var campaign = data[1].teams[1].campaigns[0];
          var user =data[1].teams[0].users[0];
          request.delete('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('该成员未参加活动');
              done();
            });
        });
        it('退出其他队的活动应该返回400', function (done) {
          var campaign = data[0].teams[0].campaigns[0];
          var user =data[1].teams[0].users[0];
          request.delete('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('该成员未参加活动');
              done();
            });
        });
        it('退出不存在的活动应该返回404', function (done) {
          var user =data[1].teams[0].users[0];
          request.delete('/campaigns/111/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(404)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('找不到该活动');
              done();
            });
        });
        it('退出关闭的活动应该返回400', function (done) {
          var campaign = data[1].teams[1].campaigns[3];
          var user = data[1].teams[0].users[0];
          request.delete('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('该活动已经关闭');
              done();
            });
        });
        it('退出未应战的活动应该返回400', function (done) {
          var campaign = data[1].teams[1].campaigns[6];
          var user = data[1].teams[0].users[0];
          request.delete('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('该活动还未应战，无法参加');
              done();
            });
        });
        it('不正确的用户ID应该返回400', function (done) {
          var campaign = data[1].teams[1].campaigns[3];
          request.delete('/campaigns/' + campaign.id +'/users/111')
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('用户信息有误');
              done();
            });
        });
    });
    describe('hr退出活动', function () {
      var hrAccessToken;
      before(function (done) {
        var hr = data[1].model;
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
      it('hr退出活动应该返回403', function (done) {
        var campaign = data[1].teams[1].campaigns[0];
        var hr = data[0].model;
        request.delete('/campaigns/' + campaign.id +'/users/' +hr.id)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限退出该活动');
            done();
          });
      });
    });
  });
};

