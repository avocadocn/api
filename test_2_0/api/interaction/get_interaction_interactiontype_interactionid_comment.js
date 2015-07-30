var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('get /interaction/:interactionType/:interactionId/comment', function() {
    var data, userToken = [];
    before(function (done) {
      data = dataService.getData();
      var user0 = data[0].users[1];
      var user1 = data[1].users[0];

      async.parallel([
        function(pcb) {
          request.post('/users/login')
          .send({
            email: user0.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (res.statusCode === 200) {
              userToken[0] = res.body.token;
            }
            pcb(err);
          });
        },
        function(pcb) {
          request.post('/users/login')
          .send({
            email: user1.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (res.statusCode === 200) {
              userToken[1] = res.body.token;
            }
            pcb(err);
          });
        }
      ],function(err, result) {
        done(err);
      });
        
    });

    it('公司成员应能获取公司活动评论列表', function(done) {
      request.get('/interaction/1/' + data[0].activities[0].id +'/comment')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('公司成员应能获取公司投票评论列表', function(done) {
      request.get('/interaction/2/' + data[0].polls[0].id +'/comment')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('公司成员应能获取公司提问评论列表', function(done) {
      request.get('/interaction/3/' + data[0].questions[0].id +'/comment')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('公司成员应能获取公司提问某回答的评论列表', function(done) {
      request.get('/interaction/3/' + data[0].questions[0].id +'/comment')
      .query({commentId:data[0].questionComments.id})
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('小队成员应能获取小队活动评论列表', function(done) {
      request.get('/interaction/1/' + data[0].teams[0].activities[0].id +'/comment')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('小队成员应能获取小队投票评论列表', function(done) {
      request.get('/interaction/2/' + data[0].teams[0].polls[0].id +'/comment')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('小队成员应能获取小队提问评论列表', function(done) {
      request.get('/interaction/3/' + data[0].teams[0].questions[0].id +'/comment')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('小队成员应能获取小队提问某回答的评论列表', function(done) {
      request.get('/interaction/3/' + data[0].teams[0].questions[0].id +'/comment')
      .query({commentId:data[0].teams[0].questionComments.id})
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.an.Array;
        done();
      });
    });

    it('非公司成员应不能获取公司活动评论列表', function(done) {
      request.get('/interaction/1/' + data[0].activities[0].id +'/comment')
      .set('x-access-token', userToken[1])
      .expect(403)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

  })
}

//todo 非私密小队成员应不能获取私密小队评论列表
