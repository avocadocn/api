var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
module.exports = function () {
  describe('get /interaction/interactionType/interactionId', function () {
    var accessToken;
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            accessToken = res.body.token;
          }
          done();
        });
    });
    it("获取公司互动详情应该成功", function (done) {
      var interactionId = data[0].activities[0].id;
      request.get('/interaction/1/'+interactionId)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body._id.should.equal(interactionId);
          done();
        });
    });
    it("获取小队互动详情应该成功", function (done) {
      var interactionId = data[0].teams[0].activities[0].id;
      request.get('/interaction/1/'+interactionId)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body._id.should.equal(interactionId);
          done();
        });
    });
    it("获取没有权限的互动应该返回403", function (done) {
      var interactionId = data[0].teams[2].activities[0].id;
      request.get('/interaction/1/'+interactionId)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.msg.should.equal("您没有权限获取该互动详情");
          done();
        });
    });
    it("获取错误类型的互动应该返回500", function (done) {
      var interactionId = data[0].teams[2].activities[0].id;
      request.get('/interaction/2/'+interactionId)
        .set('x-access-token', accessToken)
        .expect(400)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.msg.should.equal("参数错误");
          done();
        });
    });
    it("获取错误ID的互动应该返回400", function (done) {
      var interactionId = data[0].teams[2].activities[0].id;
      request.get('/interaction/2/1111')
        .set('x-access-token', accessToken)
        .expect(500)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.msg.should.equal("服务器发生错误");
          done();
        });
    });
  })
}











