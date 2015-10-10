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
    async.series([
      function(callback) {
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
          if (err) {
            callback(err);
          } else {
            callback(null, results);
          }

        })
      },
      function(callback) {
        var _data = {
          userIds: []
        };
        _data.userIds.push(data[1].users[2]._id.toString());
        _data.userIds.push(data[1].users[4]._id.toString());

        request.post('/groups/' + data[1].teams[0].model._id.toString() + '/invitation')
          .send(_data)
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return callback(err);
            callback();
          })
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    });
  });

  describe('put /groups/:groupId/invitation', function() {
    describe('处理群组邀请', function() {
      it('用户(已加入群组)不能正确处理来自该群组的邀请', function(done) {
        request.put('/groups/' + data[1].teams[0].model._id.toString() + '/invitation')
          .set('x-access-token', userToken)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('用户已加入该群组');
            done();
          })
      });

      it('用户(未受邀请)不能处理该群组的邀请', function(done) {
        request.put('/groups/' + data[1].teams[1].model._id.toString() + '/invitation')
          .set('x-access-token', userToken1)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('请求用户不在受邀列表');
            done();
          })
      });

      it('用户(受邀请)能拒绝加入该群组的请求', function(done) {
        request.put('/groups/' + data[1].teams[0].model._id.toString() + '/invitation')
          .set('x-access-token', userToken1)
          .query({
            'accept': false
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('拒绝加入受邀群组成功');
            done();
          })
      });

      it('用户(受邀请)能接受加入该群组的请求', function(done) {
        request.put('/groups/' + data[1].teams[0].model._id.toString() + '/invitation')
          .set('x-access-token', userToken2)
          .query({
            'accept': true
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('加入受邀群组成功');
            done();
          })
      });
    });
  })
}