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
        //第一个公司的第二个人
        var user = data[0].users[1];
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
    describe('公司成员', function() {
      it('用户(leader)应能邀请公司其他用户加入该群组', function(done) {
        var data = {
          userIds: []
        };
        data.userIds.push(data[0].users[2]._id.toString());
        data.userIds.push(data[0].users[2]._id.toString());
        
        request.post('/groups/' + data[0].teams[0].model._id.toString())
          .send(data)
          .set('x-access-token', userToken)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户(非leader)不能修改群组的设置', function(done) {
        request.post('/groups/' + data[0].teams[0].model._id.toString())
          .field(
            'name', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能修改不存在的群组的设置(id长度不够)', function(done) {
        request.post('/groups/1')
          .field(
            'name', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .set('x-access-token', userToken)
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });

      it('用户不能修改不存在的群组的设置(id不存在)', function(done) {
        request.post('/groups/0000c3fcd271b3943b2d44c9')
          .field(
            'name', chance.string({
              length: 10,
              pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
            })
          )
          .set('x-access-token', userToken)
          .expect(204)
          .end(function(err, res) {
            if (err) return done(err);
            done();
          })
      });
    });
  })
}