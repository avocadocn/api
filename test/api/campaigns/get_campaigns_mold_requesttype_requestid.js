var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /campaigns/mold/:requestType/:requestId', function () {
    describe('用户获取活动类型列表', function () {
      var accessToken;
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
      it('应该成功获取列表-公司', function (done) {
        var campaign = data[0].campaigns[0];
        request.get('/campaigns/mold/company/' + data[0].model.id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.be.an.Array.and.an.Object;
            done();
          });
      });
      it('应该成功获取列表-小队', function (done) {
        var campaign = data[0].campaigns[0];
        request.get('/campaigns/mold/team/' + data[0].teams[0].model.id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.be.an.Array.and.an.Object;
            res.body[0].name.should.equal(data[0].teams[0].model.group_type)
            done();
          });
      });
      it('应该成功获取列表-个人', function (done) {
        var campaign = data[0].campaigns[0];
        request.get('/campaigns/mold/user/' + data[0].users[0].id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.be.an.Array.and.an.Object;
            done();
          });
      });
    });
  });
};

