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
        //第一个公司的第五个人
        var user = data[0].users[4];
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

  describe('post /groups/:groupId/invitation', function() {
    describe('群组APP内邀请', function() {
      it('用户(该群组成员)应能邀请公司其他用户加入该群组', function(done) {
        var _data = {
          userIds: []
        };
        _data.userIds.push(data[0].users[2]._id.toString());
        _data.userIds.push(data[0].users[3]._id.toString());

        request.post('/groups/' + data[0].teams[0].model._id.toString() + '/invitation')
          .send(_data)
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户(该群组成员)应不能邀请已加入或者已邀请用户加入该群组', function(done) {
        var _data = {
          userIds: []
        };
        _data.userIds.push(data[0].users[1]._id.toString());
        _data.userIds.push(data[0].users[2]._id.toString());

        request.post('/groups/' + data[0].teams[0].model._id.toString() + '/invitation')
          .send(_data)
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('用户已经加入该群组或者已被邀请');
            done();
          })
      });

      it('用户(该群组成员)应不能邀请不存在用户加入该群组', function(done) {
        var _data = {
          userIds: []
        };
        _data.userIds.push('0000c3fcd271b3943b2d44c9');

        request.post('/groups/' + data[0].teams[0].model._id.toString() + '/invitation')
          .send(_data)
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('受邀用户不存在');
            done();
          })
      });

      it('用户(非该群组成员)应不能邀请公司其他用户加入该群组', function(done) {
        var _data = {
          userIds: []
        };
        _data.userIds.push(data[0].users[1]._id.toString());
        _data.userIds.push(data[0].users[2]._id.toString());

        request.post('/groups/' + data[0].teams[0].model._id.toString() + '/invitation')
          .send(_data)
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
  })
}