var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /rank', function () {

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
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessToken = res.body.token;
          done();
        });
    });

    it('用户正确获取地区排行榜', function (done) {
      var data = dataService.getData();
      var users = data[0].users;
      var user = data[0].users[0];

      request.get('/rank')
        .set('x-access-token', accessToken)
        .query({province:data[0].model.info.city.province,city:data[0].model.info.city.city,gid:7})
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.should.have.property('rank');
          res.body.rank.should.have.propertyByPath('group_type', '_id').eql('7');
          done();
        });
    });

    it('用户获取地区排行榜应该包含gid,city,province', function (done) {
      var data = dataService.getData();
      var users = data[0].users;
      var user = data[0].users[0];

      request.get('/rank')
        .set('x-access-token', accessToken)
        .query({province:data[0].model.info.city.province,city:data[0].model.info.city.city})
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.should.have.property('msg');
          done();
        });
    });

  });

};