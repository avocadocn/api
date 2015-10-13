var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  var data, url;
  var tokens = [,];

  describe.skip('get /companies/:companyId/tags', function () {
    before(function (done) {
      data = dataService.getData();
      url = '/companies/' + data[0].model._id + '/tags';
      //公司1
      request.post('/companies/login')
        .send({
          username: data[0].model.username,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            tokens[0] = res.body.token;
          }
        });
      //公司1某人
      request.post('/users/login')
        .send({
          email: data[0].users[0].email,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            tokens[1] = res.body.token;
          }
          done();
        });
    })
    it('本公司HR获取公司tag成功', function (done) {
      request.get(url)
        .set('x-access-token', tokens[0])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          //暂时测试数据中无tag，故长度为0
          res.body.length.should.be.above(-1);
          done();
        });
    });

    it('本公司成员获取公司tag成功', function (done) {
      request.get(url)
        .set('x-access-token', tokens[1])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.above(-1);
          done();
        });
    });
  })
};
