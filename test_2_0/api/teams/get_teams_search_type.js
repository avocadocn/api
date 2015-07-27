var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /teams/search/:type', function() {

    describe('用户搜索小队', function () {
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

      it('个人搜索同城小队应该返回200', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/search/sameCity')
          .query({tid:team.id})
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.teams.should.be.instanceof(Array);
            done();
          });
      });
      it.skip('个人搜索附近小队应该返回200', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/search/nearbyTeam')
          .query({tid:team.id,latitude:31.238168,longitude:121.479754})
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.teams.should.be.instanceof(Array);
            res.body.msg.should.equal('缺少坐标无法查找附近的小队');
            done();
          });
      });
      it('个人搜索附近小队，无坐标应该返回400', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/search/nearbyTeam')
          .query({tid:team.id})
          .set('x-access-token', accessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('缺少坐标无法查找附近的小队');
            done();
          });
      });
      it('个人搜索关键词小队应该返回200', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/search/search')
          .query({tid:team.id,key:'队'})
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.teams.should.be.instanceof(Array);
            done();
          });
      });
      it('个人搜索关键词小队,关键词为空应该返回400', function (done) {
        var team = data[0].teams[0].model;
        request.get('/teams/search/search')
          .query({tid:team.id,key:''})
          .set('x-access-token', accessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('搜索内容不能为空！');
            done();
          });
      });
      it('个人搜索错误类型的应该返回400', function (done) {
        var team = data[1].teams[0].model;
        request.get('/teams/search/sss')
          .set('x-access-token', accessToken)
          .query({tid:team.id})
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('查找类型只能是sameCity,nearbyTeam,search');
            done();
          });
      });
      it('个人搜索无小队id应该返回400', function (done) {
        var team = data[1].teams[0].model;
        request.get('/teams/search/sameCity')
          .set('x-access-token', accessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('小队ID不能为空');
            done();
          });
      });
    });
  });
};




