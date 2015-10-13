var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/:userId/open', function () {

    var hrAccessToken;
    before(function (done) {
      var data = dataService.getData();
      var user = data[0].users[5];

      request.post('/users/login')
        .send({
          phone: user.phone,
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

    it('hr可以对本公司成员解除屏蔽', function (done) {
      var data = dataService.getData();
      var user = data[0].users[9];

      request.post('/users/' + user.id + '/open')
        .set('x-access-token', hrAccessToken)
        .expect(204)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('hr不可以对其它公司成员解除屏蔽', function (done) {
      var data = dataService.getData();
      var user = data[1].users[9];

      request.post('/users/' + user.id + '/open')
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
            phone: user.phone,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            accessToken = res.body.token;
            done();
          });
      });

      it('用户不能对其它成员解除屏蔽', function (done) {
        var data = dataService.getData();
        var user = data[0].users[9];

        request.post('/users/' + user.id + '/open')
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