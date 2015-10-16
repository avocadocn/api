var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {

  var data,token;

  before(function (done) {
    data = dataService.getData();
    var user = data[0].users[0];
    request.post('/users/login')
      .send({
        phone: user.phone,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) {
          return done(err);
        }
        token = res.body.token;
        done();
      });
  })

  describe('get /favoriteRank/team', function() {
    // 根据名字查找
    it('获取排行榜第一页正确返回', function (done) {
      request.get('/favoriteRank/team')
        .set('x-access-token', token)
        .query({'page': 1})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.above(0);
          res.body[0].should.have.properties('_id');
          res.body[0].should.have.properties('score');
          done();
        });
    });
    it('获取排行榜前两个小队正确返回', function (done) {
      request.get('/favoriteRank/team')
        .set('x-access-token', token)
        .query({'limit': 2,'page': 1})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.equal(2);
          res.body[0].should.have.properties('_id');
          res.body[0].should.have.properties('score');
          done();
        });
    });
    it('获取排行榜第两个小队正确返回', function (done) {
      request.get('/favoriteRank/team')
        .set('x-access-token', token)
        .query({'limit': 1, 'page': 2})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.equal(1);
          res.body[0].should.have.properties('_id');
          res.body[0].should.have.properties('score');
          done();
        });
    });
    it('未登录用户无法根据名字查找用户', function (done) {
      var user = data[0].users[1];
      request.get('/favoriteRank/team')
        .query({name:user.nickname})
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });

    });
  });

};