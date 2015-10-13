var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {

  var data;

  before(function (done) {
    data = dataService.getData();
    done();
  })

  describe('post /search/companies', function() {
    // 根据名字查找
    it('根据名字查找应该得到正确返回', function (done) {
      var company = data[0].model;
      request.post('/search/companies')
        .send({name:company.info.name})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.companies.length.should.be.above(0);
          //第一个公司应该在返回的列表
          var index = tools.arrayObjectIndexOf(res.body.companies, company.id ,'_id');
          index.should.be.above(-1);
          done();
        });
    });
    //根据email查找
    it('根据城市查找应该得到正确返回', function (done) {
      var company = data[0].model;
      request.post('/search/companies')
        .send({city:company.info.city.city})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.companies.length.should.be.above(0);
          done();
        });

    });
  });

};