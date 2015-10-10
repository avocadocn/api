var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1, userToken2;

  before(function(done) {
    data = dataService.getData();

    async.parallel([
      function(callback) {
        //第一个公司的第一个人
        var user = data[0].users[0];
        request.post('/users/login')
          .send({
            phone: user.phone,
            password: '55yali'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            userToken = res.body.token;
            callback();
          });
      },
      function(callback) {
        //第一个公司的第三个人
        var user = data[0].users[2];
        request.post('/users/login')
          .send({
            phone: user.phone,
            password: '55yali'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            userToken1 = res.body.token;
            callback();
          });
      },
      function(callback) {
        //第一个公司的第五个人
        var user = data[0].users[4];
        request.post('/users/login')
          .send({
            phone: user.phone,
            password: '55yali'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            userToken2 = res.body.token;
            callback();
          });
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    })
  });

  describe('delete /groups/:groupId/user', function() {
    describe('退出群组', function() {
      it('用户(非群组成员)不能退出该群组', function(done) {
        request.delete('/groups/' + data[0].teams[0].model._id.toString() + '/user')
          .set('x-access-token', userToken2)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('未参加该群组');
            done();
          })
      });

      it('用户(群主)不能直接退出多人群组', function(done) {
        request.delete('/groups/' + data[0].teams[0].model._id.toString() + '/user')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('指定新群主');
            done();
          })
      });

      it('用户(群主)不能直接退出只有群主群组', function(done) {
        request.delete('/groups/' + data[0].teams[2].model._id.toString() + '/user')
          .set('x-access-token', userToken1)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('没有成员，群组会删除');
            done();
          })
      });

      it('用户(群组成员)能直接退出群组', function(done) {
        request.delete('/groups/' + data[0].teams[1].model._id.toString() + '/user')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('退出群组成功');
            done();
          })
      });

    });
  })
}