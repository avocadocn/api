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
        //第二个公司的第一个人
        var user = data[1].users[0];
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
        //第二个公司的第三个人
        var user = data[1].users[2];
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
        //第二个公司的第五个人
        var user = data[1].users[4];
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

  describe('delete /groups/:groupId/user/:userId', function() {
    describe('移除群组', function() {
      it('用户(非群主)无权限将成员移除群组', function(done) {
        request.delete('/groups/' + data[1].teams[0].model._id.toString() + '/user/' + data[1].users[0]._id.toString())
          .set('x-access-token', userToken2)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            // res.body.msg.should.equal('无权限');
            done();
          })
      });

      it('用户(群主)不能将非群组成员移除该群组', function(done) {
        request.delete('/groups/' + data[1].teams[0].model._id.toString() + '/user/' + data[1].users[4]._id.toString())
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('该成员未参加该群组');
            done();
          })
      });

      it('用户(群主)不能将自己移除该群组', function(done) {
        request.delete('/groups/' + data[1].teams[0].model._id.toString() + '/user/' + data[1].users[0]._id.toString())
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('群主无法移除该群');
            done();
          })
      });

      it('用户(群主)能将群组成员移除该群组', function(done) {
        request.delete('/groups/' + data[1].teams[0].model._id.toString() + '/user/' + data[1].users[1]._id.toString())
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('移除成员成功');
            done();
          })
      });

    });
  })
}