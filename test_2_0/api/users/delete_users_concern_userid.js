var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('delete /users/concern/:userId', function() {
    var data, userToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[1].users[1];
      request.post('/users/login')
      .send({
        phone: user.phone,
        password: '55yali'
      })
      .end(function (err, res) {
        if (res.statusCode === 200) {
          userToken = res.body.token;
        }
        done(err);
      });
    });

    it('用户应能对一个已关注过的用户删除关注成功返回', function(done) {
      request.delete('/users/concern/'+data[1].users[0]._id)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.msg.should.equal('取消关注成功');
        done();
      });
    });

    it('用户对一个未关注过的用户删除关注应成功返回', function(done) {
      request.delete('/users/concern/'+data[1].users[2]._id)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.msg.should.equal('取消关注成功');
        done();
      });
    });
  })
}