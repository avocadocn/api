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
    //根据名字查找
    it('根据名字查找应该得到正确返回', function (done) {
      var company = data[0].model;
      request.post('/search/companies')
        .send({name:company.info.name})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.above(0);
          //第一个公司应该在返回的列表
          var index = tools.arrayObjectIndexOf(res.body, company._id ,'_id');
          index.should.be.above(-1);
          done();
        });

    });
    //根据email查找
    it('根据email查找应该得到正确返回', function (done) {
      var company = data[0].model;
      request.post('/search/companies')
        .send({email:chance.email({domain:'55yali.com'})})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.above(0);
          //第一个公司应该在返回的列表
          var index = tools.arrayObjectIndexOf(res.body, company._id ,'_id');
          index.should.be.above(-1);
          done();
        });

    });
  });

};