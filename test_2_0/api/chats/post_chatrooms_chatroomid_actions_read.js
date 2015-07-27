var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');

module.exports = function () {
  describe('post /chatrooms/actions/read', function () {

    var data, userToken = [];
    before(function (done) {
      data = dataService.getData();
      async.parallel([
        function (callback) {
          var user1 = data[0].teams[0].leaders[0];
          request.post('/users/login')
            .send({
              email: user1.email,
              password: '55yali'
            })
            .end(function (err, res) {
              if (err) return callback(err);
              if (res.statusCode === 200) {
                userToken[0] = res.body.token;
              }
              callback();
            });
        },
        function (callback) {
          var user2 = data[0].users[1];
          request.post('/users/login')
            .send({
              email: user2.email,
              password: '55yali'
            })
            .end(function (err, res) {
              if (err) return callback(err);
              if (res.statusCode === 200) {
                userToken[1] = res.body.token;
              }
              callback();
            });
        }
      ], function (err, results) {
        if(err) done(err);
        else done();
      });
    });

    it('用户清除单个chatroom未读数', function (done) {
      request.post('/chatrooms/actions/read')
        .set('x-access-token', userToken[0])
        .send({
          chatRoomIds: data[0].model.id
        })
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
    });

    it('用户清除多个chatroom未读数', function (done) {
      request.post('/chatrooms/actions/read')
        .set('x-access-token', userToken[1])
        .send({
          chatRoomIds: [data[0].model.id, data[0].teams[0].model.id]
        })
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
    });

  });
};