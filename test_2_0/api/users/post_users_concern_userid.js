var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('post /users/concern/:userId', function() {
    var data, userToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[1];
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

    it('用户应能对一个未关注的用户添加关注', function(done) {
      request.post('/users/concern/'+data[0].users[2]._id)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.msg.should.equal('添加关注成功');
        done();
      });
    });

    it('用户对一个已关注的用户添加关注正确返回', function(done) {
      request.post('/users/concern/'+data[0].users[0]._id)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.msg.should.equal('已关注过');
        done();
      });
    });

    it('用户不能关注自己', function(done) {
      request.post('/users/concern/'+data[0].users[1]._id)
      .set('x-access-token', userToken)
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.msg.should.equal('无法关注自己');
        done();
      });
    })
  })
}