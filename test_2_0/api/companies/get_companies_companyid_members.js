var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe.skip('get /companies/:companyId/members', function () {
    var hrAccessToken, data, company;

    before(function (done) {
      data = dataService.getData();
      company = data[0].model;

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

    it('hr可以获取公司成员列表', function (done) {
      var users = data[0].users;

      request.get('/companies/' + company.id + '/members')
        .set('x-access-token', hrAccessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          var userList = res.body;
          users.forEach(function (user) {
            var got = false;
            for (var i = 0; i < userList.length; i++) {
              if (!user.active || !user.mail_active) {
                got = true;
                break;
              }
              if (user.id === userList[i]._id) {
                got = true;
                break;
              }
            }
            got.should.be.true;
            user.nickname.should.be.ok;
          });
          done();
        });
    });
  });
};