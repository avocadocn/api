var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe.skip('get /companies/:companyId/charts', function () {
    var hrAccessToken, data, company;

    before(function (done) {
      data = dataService.getData();
      company = data[0].model;

      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          hrAccessToken = res.body.token;
          done();
        });
    });

    it('hr可以获取公司图表每周活动数统计信息', function (done) {
      request.get('/companies/' + company.id + '/charts')
        .query({ 'chart': 'bar' })
        .set('x-access-token', hrAccessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.chartsData.campaignCounts.length.should.equal(5);
          res.body.chartsData.memberCounts.length.should.equal(5);
          done();
        });
    });

    it('hr可以获取公司图表每周活跃度统计信息', function (done) {
      request.get('/companies/' + company.id + '/charts')
        .query({ 'chart': 'pie' })
        .set('x-access-token', hrAccessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.chartsData.length.should.equal(5);
          res.body.chartsData.forEach(function (data) {
            data.zero.should.be.a.Number;
            data.once.should.be.a.Number;
            data.twice.should.be.a.Number;
            data.moreThanThreeTimes.should.be.a.Number;
          });
          done();
        });
    });
  });
};