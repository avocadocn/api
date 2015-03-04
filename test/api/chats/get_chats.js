var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var util = require('util');

module.exports = function () {
  describe('get /chats', function () {

    var data, userToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].teams[0].leaders[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            userToken = res.body.token;
          }
          done();
        });
    });

    it('队长获取小队的讨论', function (done) {
      request.get('/chats')
        .query({
          chatroom: data[0].teams[0].model.id
        })
        .set('x-access-token', userToken)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chats.should.be.ok;
          done();
        });
    });

  });
};