var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var chance = require('chance').Chance();
var util = require('util');

module.exports = function () {
  describe('delete /chats/:chatId', function() {
    var data;
    var userToken = [];
    var chatIds = [];
    before(function (done) {
      data = dataService.getData();
      async.parallel([
        function (callback) {
          var user1 = data[0].teams[0].users[0];
          request.post('/users/login')
          .send({
            email: user1.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              userToken[0] = res.body.token;
              request.post('/chatrooms/' + data[0].teams[0].model.id + '/chats')
              .send({content: chance.string({length: 20})})
              .set('x-access-token', userToken[0])
              .end(function (err, res) {
                if(err) return done(err);
                chatIds[0] = res.body.chat._id;
                callback();
              })
            }
          });
        },
        function (callback) {
          var user2 = data[0].teams[0].users[1];
          request.post('/users/login')
          .send({
            email: user2.email,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              userToken[1] = res.body.token;
              request.post('/chatrooms/' + data[0].teams[0].model.id + '/chats')
              .send({content: chance.string({length: 20})})
              .set('x-access-token', userToken[1])
              .end(function (err, res) {
                if(err) return done(err);
                chatIds[1] = res.body.chat._id;
                callback();
              })
            }
          });
        }
      ], function (err, results) {
        if(err) done(err);
        else done();
      });
    });

    it('自己可以删除chat', function (done) {
      request.delete('/chats/'+chatIds[0])
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) done(err);
        else done();
      })
    });
    it('自己不能删除别人的chat', function (done) {
      request.delete('/chats/'+chatIds[1])
      .set('x-access-token', userToken[0])
      .expect(403)
      .end(function (err, res) {
        if(err) done(err);
        else done();
      })
    })
  });
};