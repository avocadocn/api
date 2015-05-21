var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');

module.exports = function () {
  var data, url;
  var tokens = [,,];
  before(function (done) {
    data = dataService.getData();
    url = '/companies/' + data[0].model._id + '/statistics';
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
    //公司2
    request.post('/companies/login')
      .send({
        username: data[1].model.username,
        password: '55yali'
      })
      .end(function (err, res) {
        if (err) return done(err);
        if (res.statusCode === 200) {
          tokens[1] = res.body.token;
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
          tokens[2] = res.body.token;
        }
        done();
      });
  })

  describe('get /companies/:companyId/statistics', function () {
    it('本公司HR获取公司小队统计数据成功', function (done) {
      request.get(url+'?target=team&type=official')
        .set('x-access-token', tokens[0])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.above(0);
          //不应该有部门
          var index = tools.arrayObjectIndexOf(res.body,0 ,'gid');
          index.should.equal(-1);
          done();
        });
    });

    //暂时还没用到
    it.skip('本公司HR获取个人小队统计数据成功', function (done) {
      request.get(url+'?target=team&type=unofficial')
        .set('x-access-token', tokens[0])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.equal(0);
          //应该诠释部门
          done();
        });
    });

    // //暂时还没用到
    it.skip('本公司HR获取部门统计数据成功', function (done) {
      request.get(url+'?target=department')
        .set('x-access-token', tokens[0])
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.equal(0);
          done();
        });
    });

    it('非本公司HR获取公司小队统计数据失败', function (done) {
      request.get(url+'?target=team&type=official')
        .set('x-access-token', tokens[1])
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('本公司成员获取公司小队统计数据失败', function (done) {
      request.get(url+'?target=team&type=official')
        .set('x-access-token', tokens[2])
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });
  })
};
