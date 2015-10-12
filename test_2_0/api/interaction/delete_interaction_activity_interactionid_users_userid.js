var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var async = require('async');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('delete /interaction/activity/:interactionId/users/:userId', function () {
    var accessToken =[];//分别为公司的第一,二,四人
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
              phone: data[2].users[3].phone,
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
    it('应该成功退出公司活动', function (done) {
      var user = data[2].users[1];
      var interaction = data[2].activities[0];
      request.delete('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[1])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('activity');
          done();
        });
    });
    it('应该成功退出小队活动', function (done) {
      var user = data[2].users[0];
      var interaction = data[2].teams[0].activities[0];
      request.delete('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('activity');
          done();
        });
    });
    it('退出未参加的活动应该返回400', function (done) {
      var user = data[2].users[3];
      var interaction = data[2].activities[0];
      request.delete('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[2])
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您还没有参加该活动');
          done();
        });
    });
    it('退出已经截止的活动应该返回400', function (done) {
      var user = data[2].users[0];
      var interaction = data[2].activities[3];
      request.delete('/interaction/activity/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('活动报名已经截止,无法退出');
          done();
        });
    });
    it('活动Id格式错误应该返回500', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].activities[0];
      request.delete('/interaction/activity/124/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .expect(500)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('服务器发生错误');
          done();
        });
    });
    it('退出不存在的活动错误应该返回404', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].activities[0];
      request.delete('/interaction/activity/54a90ba66c8100d54ce78316/users/'+user.id)
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



