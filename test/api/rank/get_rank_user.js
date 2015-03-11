var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /rank/user', function () {

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
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessToken = res.body.token;
          done();
        });
    });

    it('获取个人的所有参加的小队的排行信息', function (done) {
      var data = dataService.getData();
      request.get('/rank/user')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.should.be.an.Array;
          res.body[0].should.have.property('list');
          res.body[0].should.have.property('team');
          done();
        });
    });

  });

};