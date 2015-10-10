var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function() {
  var data, userToken, userToken1;

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
            userToken1 = res.body.token;
            callback();
          });
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    })
  });

  describe('put /groups/:groupId/user', function() {
    describe('用户加入群组', function() {
      it('用户(群组成员)不能加入该群组', function(done) {
        request.put('/groups/' + data[0].teams[0].model._id.toString() + '/user')
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('用户已经加入该群组');
            done();
          })
      });

      it('用户(非群组成员)能申请加入需验证身份的群组', function(done) {
        request.put('/groups/' + data[0].teams[0].model._id.toString() + '/user')
          .set('x-access-token', userToken1)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('申请加入该群组成功');
            done();
          })
      });

      it('用户(非群组成员)不能重复申请加入需验证身份的群组', function(done) {
        request.put('/groups/' + data[0].teams[0].model._id.toString() + '/user')
          .set('x-access-token', userToken1)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('用户已经申请该群组');
            done();
          })
      });
      it('用户(非群组成员)能直接加入不需验证身份的群组', function(done) {
        request.put('/groups/' + data[0].teams[1].model._id.toString() + '/user')
          .set('x-access-token', userToken1)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('加入群组成功');
            done();
          })
      });
    });
  })
}