var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /messages', function () {
    var accessToken;
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].leaders[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          accessToken = res.body.token;
          done();
        });
    });

    var memberToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].users[1];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          memberToken = res.body.token;
          done();
        });
    });

    var hrToken;
    before(function (done) {
      data = dataService.getData();
      var company = data[0].model;
      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          hrToken = res.body.token;
          done();
        });
    });

    it('队长可以发布活动公告', function (done) {
      request.post('/messages')
        .send({
          type:'private',
          caption: 'testCampaignTheme',
          content: 'testContent',
          specific_type: {
            value: 3,
            child_type: 0
          },
          campaignId: data[0].teams[0].campaigns[0].id
        })
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('队长可以发布小队站内信', function (done) {
      request.post('/messages')
        .send({
          type:'private',
          caption: 'teamMessage',
          content: 'teamMessageContent',
          specific_type: {
            value: 2
          },
          team: [data[0].teams[0].model.id],
          companyId: data[0].model.id
        })
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('队长可以发队长间的活动私信', function (done) {
      request.post('/messages')
        .send({
          type: 'private',
          content: 'hi',
          msgType: 'inProvokeLeaders',
          campaignId: data[0].teams[0].campaigns[8].id
        })
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('发送成功');
          done();
        });
    });

    it('队员不能发队长间的活动私信', function (done) {
      request.post('/messages')
        .send({
          type: 'private',
          content: 'hi',
          msgType: 'inProvokeLeaders',
          campaignId: data[0].teams[0].campaigns[8].id
        })
        .set('x-access-token', memberToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('只有队长才可以向对方队长发送私信');
          done();
        });
    });

    it('hr不能发队长间的活动私信', function (done) {
      request.post('/messages')
        .send({
          type: 'private',
          content: 'hi',
          msgType: 'inProvokeLeaders',
          campaignId: data[0].teams[0].campaigns[8].id
        })
        .set('x-access-token', hrToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('只有队长才可以向对方队长发送私信');
          done();
        });
    });

    it('未应战的活动不能发队长间的私信', function (done) {
      request.post('/messages')
        .send({
          type: 'private',
          content: 'hi',
          msgType: 'inProvokeLeaders',
          campaignId: data[0].teams[0].campaigns[14].id
        })
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('对方还没有应战，不能向对方队长发送私信');
          done();
        });
    });

    it('单小队的活动不能发队长间的私信', function (done) {
      request.post('/messages')
        .send({
          type: 'private',
          content: 'hi',
          msgType: 'inProvokeLeaders',
          campaignId: data[0].teams[0].campaigns[0].id
        })
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('单小队的活动无法发送私信');
          done();
        });
    });

    it('hr可以发布活动公告', function (done) {
      console.log(data[0].teams[0].campaigns[0])
      request.post('/messages')
        .send({
          type:'private',
          caption: 'testCampaignTheme',
          content: 'testContent',
          specific_type:{
            value: 3,
            child_type: 0
          },
          campaignId: data[0].teams[0].campaigns[0].id
        })
        .set('x-access-token', hrToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('成员不可以发布活动公告', function (done) {
      request.post('/messages')
        .send({
          type:'private',
          caption: 'testCampaignTheme',
          content: 'testContent',
          specific_type:{
            value: 3,
            child_type: 0
          },
          campaignId: data[0].teams[0].campaigns[0].id
        })
        .set('x-access-token', memberToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });






  });

};