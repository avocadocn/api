var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('put /messages', function () {
    var accessToken;
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].leaders[0];
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

    var hrToken;
    before(function (done) {
      data = dataService.getData();
      var company = data[0].model;
      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          hrToken = res.body.token;
          done();
        });
    });


    // todo 此路由未被使用，暂且搁置


  });

};