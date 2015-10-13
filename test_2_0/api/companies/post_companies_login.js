var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');
var util = require('util');

module.exports = function () {
  var data ;

  describe.skip('post /companies/login', function () {
    before(function() {
      data = dataService.getData();
    })
    it('公司用户名和密码正确应该登录成功', function (done) {
      var company = data[0].model;

      request.post('/companies/login')
      .send({
        username: company.username,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) return done(err);
        res.body.id.should.equal(company._id.toString());

        jwt.verify(res.body.token, common.config.token.secret, function (err, decoded) {
          if (err) {
            console.log(err);
            err.should.not.be.ok;
          } else {
            decoded.id.should.equal(company._id.toString());
            decoded.type.should.equal('company')
          }
          done();
        });

      });
    });

    it('公司用户名和密码正确加device信息应该登录成功', function (done) {
      var company = data[0].model;

      request.post('/companies/login')
        .set('x-app-id', "id1a2b3c4d5e6f")
        .set('x-api-key', "key1a2b3c4d5e6f")
        .set('x-device-id', "429F38FB-35FD-49ED-8E90-B5ACA9FC7468")
        .set('x-device-type', "iPhone5,2")
        .set('x-platform', "iOS")
        .set('x-version', "8.1.2")
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.id.should.equal(company._id.toString());

          jwt.verify(res.body.token, common.config.token.secret, function (err, decoded) {
            if (err) {
              console.log(err);
              err.should.not.be.ok;
            } else {
              decoded.id.should.equal(company._id.toString());
              decoded.type.should.equal('company');
            }
            done();
          });

        });
    });

    var loginErrorTest = function(theme, testData, msg) {
      var title = util.format('%s应该登录失败', theme)
      it(title, function (done) {
        var company = data[0].model;
        if(testData.company) {
          company = data[testData.company].model;
        }

        request.post('/companies/login')
          .send({
            username: testData.username? testData.username : company.username,
            password: testData.password ? testData.password :'55yali'
          })
          .expect(401)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal(msg);
            done();
          });
      });
    };
    //密码
    loginErrorTest('密码错误', {password : '123456'}, '密码错误,请重新输入');
    loginErrorTest('用户名错误', {username: '1'},'用户不存在，请检查您的用户名');
    loginErrorTest('公司未激活', {company:3} , '您的公司账号尚未激活,请到邮箱内激活');
    loginErrorTest('公司被关闭', {company:4} , '您的公司账号已被关闭');
  });

};