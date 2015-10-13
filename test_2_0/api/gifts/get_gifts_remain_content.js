var app = require('../../../config/express.js'),
request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('get /gifts/remain/:content', function() {
    var users = [], userToken = [];
    before(function (done) {
      var data = dataService.getData();
      users[0] = data[0].users[0];
      users[1] = data[0].users[1];
      users[2] = data[0].users[2];
      async.parallel([
        function(pcb) {
          request.post('/users/login')
          .send({
            phone: users[0].phone,
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
            phone: users[1].phone,
            password: '55yali'
          })
          .end(function (err, res) {
            if (res.statusCode === 200) {
              userToken[1] = res.body.token;
            }
            pcb(err);
          });
        },
        function(pcb) {
          request.post('/users/login')
          .send({
            phone: users[2].phone,
            password: '55yali'
          })
          .end(function (err, res) {
            if (res.statusCode === 200) {
              userToken[2] = res.body.token;
            }
            pcb(err);
          });
        }
      ],function(err, result) {
        done(err);
      });
        
    });

    it('公司第一人获取关心里的礼物应三个礼物均无余量', function(done) {
      request.get('/gifts/remain/concern')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.flower.remainGift.should.equal(0);
        res.body.coffee.remainGift.should.equal(0);
        res.body.hug.remainGift.should.equal(0);
        done();
      });
    });

    it('公司第一人获取爱心应无余量', function(done) {
      request.get('/gifts/remain/heart')
      .set('x-access-token', userToken[0])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.heart.remainGift.should.equal(0);
        done();
      });
    });

    it('公司第二人获取关心里礼物应均余两个', function(done) {
      request.get('/gifts/remain/concern')
      .set('x-access-token', userToken[1])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.flower.remainGift.should.equal(2);
        res.body.coffee.remainGift.should.equal(2);
        res.body.hug.remainGift.should.equal(2);
        done();
      });
    });

    it('公司第二人获取爱心应余两个', function(done) {
      request.get('/gifts/remain/heart')
      .set('x-access-token', userToken[1])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.heart.remainGift.should.equal(2);
        done();
      });
    });

    it('公司第三人获取关心里礼物应均余三个', function(done) {
      request.get('/gifts/remain/concern')
      .set('x-access-token', userToken[2])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.flower.remainGift.should.equal(3);
        res.body.coffee.remainGift.should.equal(3);
        res.body.hug.remainGift.should.equal(3);
        done();
      });
    });

    it('公司第三人获取爱心应余三个', function(done) {
      request.get('/gifts/remain/heart')
      .set('x-access-token', userToken[2])
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.heart.remainGift.should.equal(3);
        done();
      });
    });
  })
}