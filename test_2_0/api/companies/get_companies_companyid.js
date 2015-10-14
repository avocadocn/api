var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var dataService = require('../../create_data');

module.exports = function () {

  describe('get /companies', function () {
    var token, data, company;

    before(function (done) {
      data = dataService.getData();
      company = data[0].model;
      var user = data[0].users[5];
      request.post('/users/adminlogin')
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
          token = res.body.token;
          done();
        });
    });

    it('hr可以获取公司信息', function (done) {
      request.get('/companies/' + company.id)
        .set('x-access-token', token)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.should.have.properties('company');
          done();
        });
    });
  })
};