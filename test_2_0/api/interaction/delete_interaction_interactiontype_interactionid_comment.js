var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');

module.exports = function () {
  describe('delete /interaction/:interactionType/:interactionId/comment', function() {
    var data, userToken = [];
    before(function (done) {
      data = dataService.getData();
      var user0 = data[1].users[0];
      var user1 = data[1].users[1];
      async.parallel([
        function(pcb) {
          request.post('/users/login')
          .send({
            phone: user0.phone,
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
            phone: user1.phone,
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

    var deleteInteractionCommentTest = function(msg, type, modelType) {
      it(msg, function(done) {
        var models = [
          data[1].activities[0], data[1].polls[0], data[1].questions[0], data[1].questions[0],
          data[1].teams[0].activities[0], data[1].teams[0].polls[0], data[1].teams[0].questions[0], data[1].teams[0].questions[0]
        ];
        var comments = [
          data[1].activityComments[0], data[1].pollComments[0], data[1].questionComments[0], data[1].answerComments[1],
          data[1].teams[0].activityComments[0], data[1].teams[0].pollComments[0], data[1].teams[0].questionComments[0], data[1].teams[0].answerComments[1],
        ];
        request.delete('/interaction/' + type + '/' + models[modelType]._id +'/comment')
        .send({commentId: comments[modelType].id})
        .set('x-access-token', userToken[0])
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
      })
    };

    deleteInteractionCommentTest('自己应能删除公司提问中自己发的评论', 3, 3);
    deleteInteractionCommentTest('自己应能删除小队提问中自己发的评论', 3, 7);
    deleteInteractionCommentTest('自己应能删除公司活动中自己发的评论', 1, 0);
    deleteInteractionCommentTest('自己应能删除公司投票中自己发的评论', 2, 1);
    deleteInteractionCommentTest('自己应能删除公司提问中自己发的回答', 3, 2);
    deleteInteractionCommentTest('自己应能删除小队活动中自己发的评论', 1, 4);
    deleteInteractionCommentTest('自己应能删除小队投票中自己发的评论', 2, 5);
    deleteInteractionCommentTest('自己应能删除小队提问中自己发的回答', 3, 6);
    

    it('非本人应不能删除公司活动评论', function(done) {
      request.delete('/interaction/1/' + data[0].activities[0].id +'/comment')
      .send({commentId: data[1].activityComments[0].id})
      .set('x-access-token', userToken[1])
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

  })
}

//todo 非私密小队成员应不能获取私密小队评论列表
