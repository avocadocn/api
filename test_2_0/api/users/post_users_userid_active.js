var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/:userId/active', function () {

    var hrAccessToken;
    var data = dataService.getData();
    before(function (done) {
      var company = data[0].model;

      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          hrAccessToken = res.body.token;
          done();
        });
    });

    it('hr可以激活公司成员', function (done) {
      var user = data[0].users[9];

      request.post('/users/' + user.id + '/active')
        .set('x-access-token', hrAccessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('hr不可以激活其它公司的成员', function (done) {
      var data = dataService.getData();
      var user = data[1].users[9];

      request.post('/users/' + user.id + '/active')
        .set('x-access-token', hrAccessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    describe('用户操作测试', function () {
      var accessToken;
      before(function (done) {
        var data = dataService.getData();
        var user = data[0].users[0];

        request.post('/users/login')
          .send({
            email: user.email,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            accessToken = res.body.token;
            done();
          });
      });

      it('用户不能激活公司成员', function (done) {
        var data = dataService.getData();
        var user = data[0].users[9];

        request.post('/users/' + user.id + '/active')
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            done();
          });
      });

    });

  });

};