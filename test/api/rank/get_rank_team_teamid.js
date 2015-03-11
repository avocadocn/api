var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /rank/team/:teamId', function () {

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

    it('用户获取小队的排行信息', function (done) {
      var data = dataService.getData();
      request.get('/rank/team/'+data[0].teams[0].model.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.should.be.an.Array;
          res.body[0].should.have.propertyByPath('score_rank', 'rank');
          done();
        });
    });

    it('用户获取其他公司的小队的排行信息应返回403', function (done) {
      var data = dataService.getData();
      request.get('/rank/team/'+data[1].teams[0].model.id)
        .set('x-access-token', accessToken)
        .expect(403)
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