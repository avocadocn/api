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
        async.parallel([
          function(callback) {
            request.put('/groups/' + data[1].teams[2].model._id.toString() + '/user')
              .set('x-access-token', userToken)
              .expect(200)
              .end(function(err, res) {
                if (err) return callback(err);
                res.body.msg.should.equal('申请加入该群组成功');
                callback();
              })
          },
          function(callback) {
            request.put('/groups/' + data[1].teams[2].model._id.toString() + '/user')
              .set('x-access-token', userToken2)
              .expect(200)
              .end(function(err, res) {
                if (err) return callback(err);
                res.body.msg.should.equal('申请加入该群组成功');
                callback();
              })
          }
        ], function(err, results) {
          if (err) {
            callback(err);
          } else {
            callback(null, results);
          }
        })
      }
    ], function(err, results) {
      if (err) return done(err);
      else done();
    });
  });

  describe('put /groups/:groupId/applicant/:userId', function() {
    describe('处理用户申请', function() {
      it('用户(非群主)无权限处理群组申请', function(done) {
        request.put('/groups/' + data[1].teams[0].model._id.toString() + '/applicant/' + data[1].users[4]._id.toString())
          .set('x-access-token', userToken1)
          .expect(403)
          .end(function(err, res) {
            if (err) return done(err);
            // res.body.msg.should.equal('无权限');
            done();
          })
      });

      it('用户(群主)无法处理已加入该群组的申请用户', function(done) {
        request.put('/groups/' + data[1].teams[2].model._id.toString() + '/applicant/' + data[1].users[2]._id.toString())
          .set('x-access-token', userToken1)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('申请用户已加入该群组');
            done();
          })
      });

      it('用户(群主)无法处理不在申请列表的用户', function(done) {
        request.put('/groups/' + data[1].teams[2].model._id.toString() + '/applicant/' + data[1].users[1]._id.toString())
          .set('x-access-token', userToken1)
          .expect(400)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('申请用户不在申请列表');
            done();
          })
      });

      it('用户(群主)拒绝申请列表的用户', function(done) {
        request.put('/groups/' + data[1].teams[2].model._id.toString() + '/applicant/' + data[1].users[0]._id.toString())
          .send({
            'accept': false
          })
          .set('x-access-token', userToken1)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('拒绝该申请');
            done();
          })
      });

      it('用户(群主)同意申请列表的用户', function(done) {
        request.put('/groups/' + data[1].teams[2].model._id.toString() + '/applicant/' + data[1].users[4]._id.toString())
          .send({
            'accept': true
          })
          .set('x-access-token', userToken1)
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('同意该申请');
            done();
          })
      });
    });
  })
}