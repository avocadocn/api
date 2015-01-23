var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /users/:userId/photos', function () {

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
          if (err) return done(err);
          accessToken = res.body.token;
          done();
        });
    });

    it('应该获取到自己上传过的照片', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.get('/users/' + user.id + '/photos')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          console.log(res.body);
          done();
        });

    });

  });

};