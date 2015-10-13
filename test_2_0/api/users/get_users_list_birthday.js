var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /users/list/birthday', function () {

    var accessToken, data, user;
    before(function (done) {
      data = dataService.getData();
      user = data[0].users[0];

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

    it('用户应能获取到未来三十天生日的人列表', function (done) {
      request.get('/users/list/birthday')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          var users = res.body;
          console.log(users);
          users.length.should.be.above(-1);
          if(users.length>0) {
            users[0]._id.should.be.ok;
            users[0].nickname.should.be.ok;
            users[0].birthday.should.be.ok;
          }
          done();
        });
    });
  });
};