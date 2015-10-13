var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/forgetPassword', function () {

    it.skip('手机和填写正确时应能更改密码', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.post('/users/forgetPassword')
        .send({
          phone: user.phone,
          code: '?',
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('手机号不存在时应返回400', function (done) {

      request.post('/users/forgetPassword')
        .send({
          phone: '13300000000'
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

  });

};