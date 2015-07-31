var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');

module.exports = function () {
  describe('post /interaction/question/:interactionId/approve', function() {
    var data, userToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[0];
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

    it('能为未赞过的公司问题的回答点赞', function(done) {
      request.post('/interaction/question/' + data[0].questions[0].id + '/approve')
      .send({commentId: data[0].questionComments[4].id})
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.ok;
        done();
      });
    });

    it('能为未赞过的小队问题的回答点赞', function(done) {
      request.post('/interaction/question/' + data[0].teams[0].questions[0].id + '/approve')
      .send({commentId: data[0].teams[0].questionComments[4].id})
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.be.ok;
        done();
      });
    });

    it('已赞过的回答再点赞应返回400', function(done) {
      request.post('/interaction/question/' + data[0].teams[0].questions[0].id + '/approve')
      .send({commentId: data[0].teams[0].questionComments[0].id})
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
