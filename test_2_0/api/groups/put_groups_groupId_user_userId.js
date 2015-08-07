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
            email: user.email,
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
        //第二个公司的第二个人
        var user = data[1].users[1];
        request.post('/users/login')
          .send({
            email: user.email,
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
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    })
  });

  describe('put /groups/:groupId/user/:userId', function() {
    describe('指定新群主', function() {
      it('用户(非群主)无权限指定新群主', function(done) {
        request.put('/groups/' + data[1].teams[0].model._id.toString() + '/user/' + data[1].users[0]._id.toString())
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            // res.body.msg.should.equal('无权限');
            done();
          })
      });

      it('用户(群主)不能将非群组成员指定为新群主', function(done) {
        request.put('/groups/' + data[1].teams[0].model._id.toString() + '/user/' + data[1].users[3]._id.toString())
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('被指定成员非该群组成员');
            done();
          })
      });

      it('用户(群主)能将群组成员指定为新群主', function(done) {
        request.put('/groups/' + data[1].teams[1].model._id.toString() + '/user/' + data[1].users[0]._id.toString())
          .set('x-access-token', userToken1)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('指定群主成功');
            done();
          })
      });

    });
  })
}