var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');

module.exports = function () {
  describe('post /chats', function() {
    describe('用户发chat', function() {
      var data;
      var userToken;
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

      it('用户应能在自己队发chat', function (done) {
        request.post('/chats')
        .send({chatroomId:data[0].teams[1].model.id ,content: chance.string({length: 20})})
        .set('x-access-token', userToken)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chat.should.be.ok;
          done();
        })
      });
      // it('用户应能在自己队发带图片的chat', function() {
        
      // });
      it('队长应该能在公司管理组发chat', function (done) {
        request.post('/chats')
        .send({chatroomId:data[0].model.id ,content: chance.string({length: 20})})
        .set('x-access-token', userToken)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.chat.should.be.ok;
          done();
        })
      });
      it('用户应不能发空的chat', function (done) {
        request.post('/chats')
        .send({chatroomId:data[0].teams[1].model.id ,content: chance.string({length: 20})})
        .set('x-access-token', userToken)
        .expect(422)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
      });
      it('用户应不能在非自己小队发chat', function (done) {
        request.post('/chats')
        .send({chatroomId:data[0].teams[2].model.id ,content: chance.string({length: 20})})
        .set('x-access-token', userToken)
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
      });
    });
    // describe('hr发chat', function() {
    //   var data;
    //   var hrToken;
    //   before(function (done) {
    //     data = dataService.getData();
    //     var hr = data[0].model;
    //     request.post('/companies/login')
    //       .send({
    //         username: hr.username,
    //         password: '55yali'
    //       })
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         if (res.statusCode === 200) {
    //           hrAccessToken = res.body.token;
    //         }
    //         done();
    //       });
    //   })

    //   it('hr应不能发chat', function() {

    //   })
    // });
  });
};