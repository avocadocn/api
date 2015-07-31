var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var chance = require('chance').Chance();

module.exports = function () {
  describe('post /interaction/:interactionType/:interactionId/comment', function() {
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

    var postInteractionCommentTest = function(msg, type, modelType) {
      it(msg, function(done) {
        var models = [data[0].activities[0], data[0].polls[0], data[0].questions[0], 
          data[0].teams[0].activities[0], data[0].teams[0].polls[0], data[0].teams[0].questions[0]];
        request.post('/interaction/' + type + '/' + models[modelType]._id +'/comment')
        .send({content:chance.string()})
        .set('x-access-token', userToken[0])
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.should.be.ok;
          done();
        });
      })
    };

    postInteractionCommentTest('公司成员应能评论公司活动', 1, 0);
    postInteractionCommentTest('公司成员应能评论公司投票', 2, 1);
    postInteractionCommentTest('公司成员应能回答公司提问', 3, 2);
    postInteractionCommentTest('小队成员应能评论小队活动', 1, 3);
    postInteractionCommentTest('小队成员应能评论小队投票', 2, 4);
    postInteractionCommentTest('小队成员应能回答小队提问', 3, 5);

    it('公司成员应能评论公司提问某回答', function(done) {
      request.post('/interaction/3/' + data[0].questions[0]._id +'/comment')
      .send({commentId:data[0].questionComments[0].id, content:chance.string()})
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.ok;
        done();
      });
    });

    it('小队成员应能评论小队提问某回答', function(done) {
      request.post('/interaction/3/' + data[0].teams[0].questions[0]._id +'/comment')
      .send({commentId:data[0].teams[0].questionComments[0].id, content:chance.string()})
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.ok;
        done();
      });
    });

    it('非公司成员应不能评论公司活动', function(done) {
      request.post('/interaction/1/' + data[0].activities[0]._id +'/comment')
      .send({content:chance.string()})
      .set('x-access-token', userToken[1])
      .expect(403)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

  })
}

//todo 非私密小队成员应不能评论私密小队活动
