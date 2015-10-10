var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var jwt = require('jsonwebtoken');

var dataService = require('../../create_data');
var common = require('../../support/common');
var util = require('util');

module.exports = function () {
  var data, company, token, user, userToken;
  before(function(done) {
    //先登录拿token
    data = dataService.getData();
    company = data[0].model;
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
            token = res.body.token;
            decoded.id.should.equal(company._id.toString());
            decoded.type.should.equal('company')
          }
        });
      });
    user = data[0].users[0];
    request.post('/users/login')
      .send({
        phone: user.phone,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.cid.should.equal(user.cid.toString());
        res.body.id.should.equal(user.id);

        jwt.verify(res.body.token, common.config.token.secret, function (err, decoded) {
          if (err) {
            console.log(err);
            err.should.not.be.ok;
          } else {
            userToken = res.body.token;
            decoded.id.should.equal(user.id);
            decoded.type.should.equal('user')
          }
          done();
        });
      })
  })

  describe('post /companies/logout', function() {
    it('token正确应该登出成功', function (done) {
      request.post('/companies/logout')
        .set('x-access-token', token)
        .expect(204)
        .end(function (err, res) {
          if (err) return done(err);
          else done();
        });
    });

    it('token错误应登出失败', function (done) {
      request.post('/companies/logout')
        .set('x-access-token', '1')
        .expect(401)
        .end(function (err,res) {
          if(err) return done(err);
          else done();
        });
    });

    it('用user的token登出应该返回403', function (done) {
      request.post('/companies/logout')
        .set('x-access-token', userToken)
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          else done();
        })
    });
  })
};
