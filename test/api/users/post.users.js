var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('post /users', function () {

    //it('正常数据应该注册成功', function (done) {
    //  var data = dataService.getData();
    //  var company = data[0].model;
    //
    //  request.post('/users')
    //    .send({
    //      email: 'userrgtest@' + company.email.domain[0],
    //      nickname: 'UserRgTestNickname',
    //      realname: 'UserRgTestRealname',
    //      cid: company.id,
    //      password: '55yali',
    //      phone: '12345678901'
    //    })
    //    .expect(201)
    //    .end(function (err, res) {
    //      if (err) {
    //        console.log(res.body);
    //        return done(err);
    //      } else {
    //        done();
    //      }
    //    });
    //
    //});

  });

};