var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var async = require('async');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('post /interaction/activity/:interactionId/users/:userId', function () {
    var accessToken =[];//分别为公司的第一,二,三个人
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    var data;
    before(function (done) {
      data = dataService.getData();
      async.parallel([
        function(cb) {
          request.post('/users/login')
            .send({
              phone: data[2].users[0].phone,
              password: '55yali'
            })
            .end(function (err, res) {
              if (err) return cb(err);
              if (res.statusCode === 200) {
                accessToken[0] = res.body.token;
              }
              cb()
            });
        },
        function(cb) {
          request.post('/users/login')
            .send({
              phone: data[2].users[1].phone,
              password: '55yali'
            })
            .end(function (err, res) {
              if (err) return cb(err);
              if (res.statusCode === 200) {
                accessToken[1] = res.body.token;
              }
              cb()
            });
        },function(cb) {
          request.post('/users/login')
            .send({
              phone: data[2].users[2].phone,
              password: '55yali'
            })
            .end(function (err, res) {
              if (err) return cb(err);
              if (res.statusCode === 200) {
                accessToken[2] = res.body.token;
              }
              cb()
            });
        }
      ],
      function(err, results) {
        done(err)
      });
      
    });
    it('应该成功参加公司活动', function (done) {
      var user = data[2].users[2];
      var interaction = data[2].activities[0];
      request.post('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[2])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('activity');
          done();
        });
    });
    it('应该成功参加小队活动', function (done) {
      var user = data[2].users[1];
      var interaction = data[2].teams[0].activities[0];
      request.post('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[1])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('activity');
          done();
        });
    });
    it('参加已经参加的活动应该返回400', function (done) {
      var user = data[2].users[0];
      var interaction = data[2].activities[0];
      request.post('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您已经参加了该活动');
          done();
        });
    });
    it('参加已经截止的活动应该返回400', function (done) {
      var user = data[2].users[1];
      var interaction = data[2].teams[0].activities[3];
      request.post('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[1])
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('活动报名已经截止');
          done();
        });
    });
    it('参加没有参加的小队的活动应该返回403', function (done) {
      var user = data[2].users[1];
      var interaction = data[2].teams[2].activities[0];
      request.post('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[1])
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您没有权限参加该活动');
          done();
        });
    });
    it('参加其他公司的活动应该返回403', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].activities[0];
      request.post('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您没有权限参加该活动');
          done();
        });
    });
    it('活动Id格式错误应该返回500', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].activities[0];
      request.post('/interaction/activity/124/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(500)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('服务器发生错误');
          done();
        });
    });
    it('参加不存在的活动错误应该返回404', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].activities[0];
      request.post('/interaction/activity/54a90ba66c8100d54ce78316/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(404)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('该活动不存在');
          done();
        });
    });
  })
}



