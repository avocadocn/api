var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('post /gifts', function() {
    var data, user0, user1, userToken = [];
    before(function (done) {
      data = dataService.getData();
      user0 = data[0].users[0];
      user1 = data[0].users[1];
      async.parallel([
        function(pcb) {
          request.post('/users/login')
          .send({
            phone: user0.phone,
            password: '55yali'
          })
          .end(function (err, res) {
            if (res.statusCode === 200) {
              userToken[0] = res.body.token;
            }
            pcb(err);
          });
        },
        function(pcb) {
          request.post('/users/login')
          .send({
            phone: user1.phone,
            password: '55yali'
          })
          .end(function (err, res) {
            if (res.statusCode === 200) {
              userToken[1] = res.body.token;
            }
            pcb(err);
          });
        }
      ],function(err, result) {
        done(err);
      });
        
    });

    //第1个人发给第2个
    it('用户给其它用户发送礼物应成功返回送出的礼物', function(done) {
      request.post('/gifts')
      .send({
        "receiverId": user1._id,
        "giftIndex": 4,
        "addition": chance.string()
      })
      .set('x-access-token', userToken[1])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.gift.should.be.ok;
        done();
      });
    });

    //第0个发给第1个
    it('当无礼物余量，发送礼物应失败', function(done) {
      request.post('/gifts')
      .send({
        "receiverId": user0._id,
        "giftIndex": 4,
        "addition": chance.string()
      })
      .set('x-access-token', userToken[0])
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.msg.should.be.ok;
        done();
      });
    });

    it('当参数错误时，发送礼物应失败', function(done) {
      request.post('/gifts')
      .send({
        "receiverId": user1._id,
        "giftIndex": 6,
        "addition": chance.string()
      })
      .set('x-access-token', userToken[1])
      .expect(400)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

  })
}