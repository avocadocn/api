var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var util = require('util');
var async = require('async');

module.exports = function () {
  describe('get /chats', function () {

    var data, leaderToken, memberToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].leaders[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            leaderToken = res.body.token;
          }
          done();
        });
    });

    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].users[1];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            memberToken = res.body.token;
          }
          done();
        });
    });

    it('队长获取小队的讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[0].teams[0].model.id
        })
        .set('x-access-token', leaderToken)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chats.should.be.ok;
          done();
        });
    });

    it('队员获取小队的讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[0].teams[1].model.id
        })
        .set('x-access-token', leaderToken)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chats.should.be.ok;
          done();
        });
    });

    it('不是队员不能获取小队的讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[0].teams[2].model.id
        })
        .set('x-access-token', leaderToken)
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.msg.should.be.ok;
          done();
        });
    });

    it('不能获取其它公司的讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[1].teams[0].model.id
        })
        .set('x-access-token', leaderToken)
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.msg.should.be.ok;
          done();
        });
    });

    it('队长可以获取公司讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[0].model.id
        })
        .set('x-access-token', leaderToken)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chats.should.be.ok;
          done();
        });
    });

    it('一般成员不能获取公司讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[0].model.id
        })
        .set('x-access-token', memberToken)
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.msg.should.be.ok;
          done();
        });
    });

    it('分页测试', function (done) {

      async.waterfall([
        function (waterfallCallback) {
          request.get('/chats')
            .query({
              chatroom: data[0].model.id
            })
            .set('x-access-token', leaderToken)
            .expect(200)
            .end(function (err, res) {
              if(err) return done(err);
              res.body.chats.should.be.ok;
              res.body.hasNextPage.should.be.true;
              res.body.nextDate.should.be.ok;
              res.body.nextId.should.be.ok;
              waterfallCallback(null, {
                nextDate: res.body.nextDate,
                nextId: res.body.nextId
              });
            });
        },
        function (pageData, waterfallCallback) {
          request.get('/chats')
            .query({
              chatroom: data[0].model.id,
              nextDate: new Date(pageData.nextDate).valueOf(),
              nextId: pageData.nextId
            })
            .set('x-access-token', leaderToken)
            .expect(200)
            .end(function (err, res) {
              if(err) return done(err);
              res.body.chats.should.be.ok;
              res.body.hasNextPage.should.be.false;
              done();
            });
        }
      ]);
    });

  });
};