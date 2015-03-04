var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');

module.exports = function () {
  describe('get /chatrooms', function () {

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

    it('队长获取聊天列表成功，且应有公司管理聊天室', function (done) {
      request.get('/chatrooms')
        .set('x-access-token', userToken[0])
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chatRoomList.should.be.ok;
          var index = tools.arrayObjectIndexOf(res.body.chatRoomList, data[0].model.id, '_id');
          index.should.be.above(-1);
          done();
        });
    });

    it('队员获取聊天列表成功,且应无公司管理聊天室', function (done) {
      request.get('/chatrooms')
        .set('x-access-token', userToken[1])
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chatRoomList.should.be.ok;
          var index = tools.arrayObjectIndexOf(res.body.chatRoomList, data[0].model.id, '_id');
          index.should.equal(-1);
          done();
        });
    });
  });
};