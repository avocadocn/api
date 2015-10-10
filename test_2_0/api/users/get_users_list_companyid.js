var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /users/list/:companyId', function () {

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
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessToken = res.body.token;
          done();
        });
    });

    it('用户可以获取到自己公司的通讯录', function (done) {
      var data = dataService.getData();
      var users = data[0].users;
      var user = data[0].users[0];

      request.get('/users/list/' + user.cid.toString())
        .set('x-access-token', accessToken)
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
              if (user.id === userList[i]._id
                && user.email === userList[i].email) {
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

    it('用户不应该获取到其它公司的通讯录', function (done) {
      var data = dataService.getData();

      request.get('/users/list/' + data[1].model.id)
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

    describe('hr获取公司成员列表', function () {
      var hrAccessToken;

      before(function (done) {
        var data = dataService.getData();
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

      it('hr可以获取公司成员列表', function (done) {
        var data = dataService.getData();
        var company = data[0].model;
        var users = data[0].users;

        request.get('/users/list/' + company.id)
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

      it('hr不可以获取其它公司的成员列表', function (done) {
        var data = dataService.getData();

        request.get('/users/list/' + data[1].model.id)
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

    });

  });

};