var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /campaigns/:campaignId/users/:userId', function () {
    var data;
    describe('用户参加活动', function () {
        var accessToken;
        
        before(function (done) {
          data = dataService.getData();
          var user = data[0].teams[0].users[0];
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
        it('应该成功参加活动', function (done) {
          var campaign = data[0].teams[1].campaigns[0];
          var user = data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.members_count.should.equal(2);
              done();
            });
        });
        it('参加已报名截止的活动应该返回400', function (done) {
          var campaign = data[0].teams[1].campaigns[2];
          var user = data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('活动报名已经截止');
              done();
            });
        });
        it('参加已报名达到上限的活动应该返回400', function (done) {
          var campaign = data[0].campaigns[4];
          var user = data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('报名人数已达上限');
              done();
            });
        });
        it('参加已参加过的活动应该返回400', function (done) {
          var campaign = data[0].teams[0].campaigns[0];
          var user =data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('您已经参加该活动');
              done();
            });
        });
        it('参加其他队的活动应该返回403', function (done) {
          var campaign = data[1].teams[0].campaigns[0];
          var user =data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(403)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('您没有权限参加该活动');
              done();
            });
        });
        it('参加不存在的活动应该返回404', function (done) {
          var user =data[0].teams[0].users[0];
          request.post('/campaigns/111/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(404)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('找不到该活动');
              done();
            });
        });
        it('参加关闭的活动应该返回400', function (done) {
          var campaign = data[0].teams[1].campaigns[3];
          var user = data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('该活动已经关闭');
              done();
            });
        });
        it('参加未应战的活动应该返回400', function (done) {
          var campaign = data[0].teams[1].campaigns[6];
          var user = data[0].teams[0].users[0];
          request.post('/campaigns/' + campaign.id +'/users/' +user.id)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('该活动还未应战，无法参加');
              done();
            });
        });
        it('不正确的用户ID应该返回400', function (done) {
          var campaign = data[0].teams[1].campaigns[3];
          request.post('/campaigns/' + campaign.id +'/users/111')
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.equal('用户信息有误');
              done();
            });
        });
    });
    describe('hr参加活动', function () {
      var hrAccessToken;
      before(function (done) {
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
      it('hr参加活动应该返回403', function (done) {
        var campaign = data[0].teams[0].campaigns[0];
        var hr = data[0].model;
        request.post('/campaigns/' + campaign.id +'/users/' +hr.id)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限参加该活动');
            done();
          });
      });
    });
  });
};



