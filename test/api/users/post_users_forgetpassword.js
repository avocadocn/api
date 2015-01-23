var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users/forgetPassword', function () {

    it('邮箱填写正确时应该发送激活邮件', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.post('/users/forgetPassword')
        .send({
          email: user.email
        })
        .expect(201)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('邮箱填写错误时应返回400', function (done) {

      request.post('/users/forgetPassword')
        .send({
          email: 'unexist@email.com'
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