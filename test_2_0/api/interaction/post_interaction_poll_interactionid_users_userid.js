var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var async = require('async');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('post /interaction/poll/:interactionId/users/:userId', function () {
    var accessToken =[];//分别为公司的第一,二,三人
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
    it('应该成功投公司范围的投票', function (done) {
      var user = data[2].users[2];
      var interaction = data[2].polls[0];
      request.post('/interaction/poll/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[2])
        .send({index:1})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('poll');
          done();
        });
    });

    it('应该成功投小队范围的投票', function (done) {
      var user = data[2].users[1];
      var interaction = data[2].teams[0].polls[0];
      request.post('/interaction/poll/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[1])
        .send({index:1})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('poll');
          done();
        });
    });
    it('投已经投过的投票应该返回400', function (done) {
      var user = data[2].users[0];
      var interaction = data[2].polls[0];
      request.post('/interaction/poll/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .send({index:1})
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您已经进行了投票');
          done();
        });
    });
    it('投没有参加的小队的投票应该返回403', function (done) {
      var user = data[2].users[1];
      var interaction = data[2].teams[2].polls[0];
      request.post('/interaction/poll/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[1])
        .send({index:1})
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您没有权限进行投票');
          done();
        });
    });
    it('投其他公司的投票应该返回403', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].polls[0];
      request.post('/interaction/poll/'+interaction.id+'/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .send({index:1})
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您没有权限进行投票');
          done();
        });
    });
    it('投票Id格式错误应该返回500', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].polls[0];
      request.post('/interaction/poll/124/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .send({index:1})
        .expect(500)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('服务器发生错误');
          done();
        });
    });
    it('投不存在的投票错误应该返回404', function (done) {
      var user = data[2].users[0];
      var interaction = data[1].polls[0];
      request.post('/interaction/poll/54a90ba66c8100d54ce78316/users/'+user.id)
        .set('x-access-token', accessToken[0])
        .send({index:1})
        .expect(404)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('该投票不存在');
          done();
        });
    });
  })
}



