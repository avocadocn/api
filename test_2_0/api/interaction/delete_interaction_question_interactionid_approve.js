var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');

module.exports = function () {
  describe('delete /interaction/question/:interactionId/approve', function() {
    var data, userToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[2].users[0];
      request.post('/users/login')
      .send({
        email: user.email,
        password: '55yali'
      })
      .end(function (err, res) {
        if (res.statusCode === 200) {
          userToken = res.body.token;
        }
        done(err);
      });
    });

    it('能为赞过的公司问题的回答取消点赞', function(done) {
      request.delete('/interaction/question/' + data[2].questions[0].id + '/approve')
      .send({commentId: data[2].questionComments[3].id})
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.ok;
        done();
      });
    });

    it('能为赞过的小队问题的回答取消点赞', function(done) {
      request.delete('/interaction/question/' + data[2].teams[0].questions[0].id + '/approve')
      .send({commentId: data[2].teams[0].questionComments[3].id})
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.ok;
        done();
      });
    });

    it('未点过赞的回答取消点赞应返回400', function(done) {
      request.delete('/interaction/question/' + data[2].teams[0].questions[0].id + '/approve')
      .send({commentId: data[2].teams[0].questionComments[4].id})
      .set('x-access-token', userToken)
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

    it('取消赞不存在的回答应返回400', function(done) {
      request.delete('/interaction/question/' + data[2].teams[0].questions[0].id + '/approve')
      .send({commentId: data[2].teams[0].questions[0].id})
      .set('x-access-token', userToken)
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });
  });
}

//todo 私密小队问答非队员应返回403
