var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('get /interaction/template/:templateType/:templateId', function () {
    var accessToken;
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    var data;
    var templates;
    before(function (done) {
      data = dataService.getData();
      templates = dataService.getTemplate();
      var user = data[0].users[0];
      request.post('/users/login')
        .send({
          phone: user.phone,
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
    it("获取活动模板详情应该成功", function (done) {
      request.get('/interaction/template/1/'+templates[0].id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body._id.should.equal(templates[0].id);
          done();
        });
    });
    it("获取投票模板详情应该成功", function (done) {
      request.get('/interaction/template/2/'+templates[1].id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body._id.should.equal(templates[1].id);
          done();
        });
    });
    it("获取求助模板详情应该成功", function (done) {
      request.get('/interaction/template/3/'+templates[2].id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body._id.should.equal(templates[2].id);
          done();
        });
    });
    it("获取错误类型的互动应该返回500", function (done) {
      request.get('/interaction/template/4/'+templates[2].id)
        .set('x-access-token', accessToken)
        .expect(400)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.msg.should.equal("互动类型错误");
          done();
        });
    });
    it("获取错误ID的互动应该返回400", function (done) {
      request.get('/interaction/template/2/1111')
        .set('x-access-token', accessToken)
        .expect(400)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.msg.should.equal("数据格式错误");
          done();
        });
    });
  })
}











