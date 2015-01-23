var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('delete /campaigns/:campaignId', function () {
    describe('user close campaigns', function () {
      var accessToken;

      before(function (done) {
        var data = dataService.getData();
        var user = data[2].teams[0].leaders[0];
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
      it('should close campaign', function (done) {
        var data = dataService.getData();
        var campaign = data[2].teams[0].campaigns[0];
        request.delete('/campaigns/' + campaign.id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.result.should.equal(1);
            done();
          });
      });
      it('should get 404 because has colsed', function (done) {
        var data = dataService.getData();
        var campaign = data[2].teams[0].campaigns[0];
        request.delete('/campaigns/'+ campaign.id)
          .set('x-access-token', accessToken)
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('未找到可以关闭的活动');
            done();
          });
      });
      it('should get 404 because has not found', function (done) {
        request.delete('/campaigns/111')
          .set('x-access-token', accessToken)
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('找不到该活动');
            done();
          });
      });

      it('should get 403', function (done) {
        var data = dataService.getData();
        var campaign = data[1].campaigns[0];
        request.delete('/campaigns/'+ campaign.id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限获取该活动');
            done();
          });
      });
      it('should get 401', function (done) {
        var data = dataService.getData();
        var campaign = data[1].campaigns[0];
        request.delete('/campaigns/'+ campaign.id)
          .set('x-access-token', '111')
          .expect(401)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有登录或者登录超时，请重新登录');
            done();
          });
      });
    });
    describe('hr close campaigns', function () {
      var hrAccessToken;

      before(function (done) {
        var data = dataService.getData();
        var hr = data[2].model;
        request.post('/companies/login')
          .send({
            username: hr.username,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              hrAccessToken = res.body.token;
            }
            done();
          });

      });
      it('should close company campaign', function (done) {
        var data = dataService.getData();
        var campaign = data[2].campaigns[0];
        request.delete('/campaigns/' + campaign.id)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.result.should.equal(1);
            done();
          });
      });
      it('should get 403 because other company campaign', function (done) {
        var data = dataService.getData();
        var campaign = data[1].campaigns[0];
        request.delete('/campaigns/'+ campaign.id)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限获取该活动');
            done();
          });
      });
      it('should close team campaign', function (done) {
        var data = dataService.getData();
        var campaign = data[2].teams[0].campaigns[1];
        request.delete('/campaigns/' + campaign.id)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.result.should.equal(1);
            done();
          });
      });
    });
  });

};





