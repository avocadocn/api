var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var dataService = require('../../create_data');
var chance = require('chance').Chance();

module.exports = function () {
  var data ;
  before(function() {
    data = dataService.getData();
  })

  describe('post /companies/validate', function () {
    var validateSuccessTest = function(theme, testData) {
      var title= util.format('%s应该验证成功并返回可以使用', theme);
      it(title, function (done) {
        request.post('/companies/validate')
        .send(testData)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.validate.should.equal(3);
          res.body.msg.should.equal('可以使用');
          done();
        });
      });
    };
    validateSuccessTest('邮箱', {email: chance.email()});
    validateSuccessTest('用户名', {username: chance.string()});
    validateSuccessTest('公司名', {name: chance.string()});

    var validateDuplicateTest = function(theme) {
      var title= util.format('%s应该返回msg:已经存在', theme);
      it(title, function (done) {
        var testData;
        var dupCompany = data[0].model;
        if(theme === '邮箱')
          testData = {email: dupCompany.login_email};
        else if(theme==='用户名')
          testData = {username: dupCompany.username};
        else if(theme === '公司名')
          testData = {name: dupCompany.info.name};
        request.post('/companies/validate')
        .send(testData)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.validate.should.equal(0);
          res.body.msg.should.equal('已经存在');
          done();
        });
      });
    };
    validateDuplicateTest('邮箱');
    validateDuplicateTest('用户名');
    validateDuplicateTest('公司名');

    var validateNameTest = function(validate,theme,msg) {
      var title= util.format('用户名查询后%s应该返回msg:%s', theme, msg);
      it(title, function (done) {
        var testData = {name:''};
        if(validate===1) {
          testData.name = data[3].model.info.name;
        }else {
          testData.name = data[4].model.info.name;
        }
        request.post('/companies/validate')
        .send(testData)
        .expect(200)
        .end(function (err, res) {
          if(err) return done(err);
          res.body.validate.should.equal(validate);
          res.body.msg.should.equal(msg);
          done();
        });
      })


    };
    validateNameTest(1, '未激活', '已被使用，未激活');
    validateNameTest(2, '被屏蔽', '被屏蔽了，可使用');
  })
};
