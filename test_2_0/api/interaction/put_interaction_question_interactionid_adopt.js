var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var async = require('async');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('put /interaction/question/:interactionId/adopt', function () {
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
        }
      ],
      function(err, results) {
        done(err)
      });
      
    });
    it('应该成功采纳公司范围答案', function (done) {
      var interaction = data[2].questions[0];
      var comment = data[2].questionComments[0];
      request.put('/interaction/question/'+interaction.id+'/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:comment.id})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('question');
          done();
        });
    });

    it('应该成功采纳小队范围答案', function (done) {
      var interaction = data[2].teams[0].questions[0];
      var comment = data[2].teams[0].questionComments[0];
      request.put('/interaction/question/'+interaction.id+'/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:comment.id})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('question');
          done();
        });
    });
    it('采纳已经采纳过的求助应返回400', function (done) {
      var interaction = data[2].teams[0].questions[0];
      var comment = data[2].teams[0].questionComments[0];
      request.put('/interaction/question/'+interaction.id+'/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:comment.id})
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您提交的参数错误');
          done();
        });
    });
    it('采纳不是自己发的求助应返回403', function (done) {
      var interaction = data[2].teams[2].questions[0];
      var comment = data[2].teams[2].questionComments[0];
      request.put('/interaction/question/'+interaction.id+'/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:comment.id})
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您没有权限采纳回答');
          done();
        });
    });
    it('求助Id格式错误应该返回400', function (done) {
      var interaction = data[2].teams[1].questions[0];
      var comment = data[2].teams[0].questionComments[0];
      request.put('/interaction/question/1234/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:comment.id})
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您提交的参数错误');
          done();
        });
    });

    it('采纳不存在的求助应该返回400', function (done) {
      var comment = data[2].teams[0].questionComments[0];
      request.put('/interaction/question/54a90ba66c8100d54ce78316/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:comment.id})
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您提交的参数错误');
          done();
        });
    });
    it('采纳不存在的回答应该返回400', function (done) {
      var interaction = data[2].teams[0].questions[0];
      var comment = data[2].teams[0].questionComments[0];
      request.put('/interaction/question/'+interaction.id+'/adopt')
        .set('x-access-token', accessToken[0])
        .send({commentId:interaction.id})
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您提交的参数错误');
          done();
        });
    });
    it('采纳未发送Id的回答应该返回400', function (done) {
      var interaction = data[2].teams[0].questions[0];
      var comment = data[2].teams[0].questionComments[0];
      request.put('/interaction/question/'+interaction.id+'/adopt')
        .set('x-access-token', accessToken[0])
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.equal('您提交的参数错误');
          done();
        });
    });
  })
}



