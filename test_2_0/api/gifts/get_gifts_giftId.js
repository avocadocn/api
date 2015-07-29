var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('get /gifts/:giftId', function() {
    var data, user0, user1, userToken = [];
    before(function (done) {
      data = dataService.getData();
      user0 = data[0].users[0];
      user1 = data[0].users[2];
      async.parallel([
        function(pcb) {
          request.post('/users/login')
          .send({
            email: user0.email,
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
            email: user1.email,
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

    it('礼物发起方应能获取礼物详情', function(done) {
      request.get('/gifts/'+data[0].gifts[0]._id)
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.gift.should.be.ok;
        done();
      });
    });

    it('礼物接收方应能获取礼物详情', function(done) {
      request.get('/gifts/'+data[0].gifts[15]._id)
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.gift.should.be.ok;
        done();
      });
    });

    it('非礼物接收、发起方应不能获取礼物详情', function(done) {
      request.get('/gifts/'+data[0].gifts[0]._id)
      .set('x-access-token', userToken[1])
      .expect(403)
      .end(function (err, res) {
        if(err) return done(err);
        done();
      });
    });

  })
}