var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /users/validate', function () {

    it('已注册激活的邮箱应该返回{active:3}', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];

      request.post('/users/validate')
        .send({
          email: user.email
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.active.should.equal(3);
          done();
        });
    });

    it('没有注册过的邮箱应该返回{active:1}', function (done) {
      request.post('/users/validate')
        .send({
          email: 'example@email.com'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.active.should.equal(1);
          done();
        });
    });

    it('邀请码和公司匹配时应该返回{invitekeyCheck:1}', function (done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.post('/users/validate')
        .send({
          cid: company.id,
          inviteKey: company.invite_key
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.invitekeyCheck.should.equal(1);
          done();
        });
    });

    it('邀请码和公司不匹配时应该返回{invitekeyCheck:2}', function (done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.post('/users/validate')
        .send({
          cid: company.id,
          inviteKey: 'toolongerrorkey'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.invitekeyCheck.should.equal(2);
          done();
        });
    });

    it('公司id不对且不是objectid时应该返回500', function (done) {
      request.post('/users/validate')
        .send({
          cid: 'error id',
          inviteKey: 'toolongerrorkey'
        })
        .expect(500)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('公司id不对但是objectid时应该返回400', function (done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.post('/users/validate')
        .send({
          cid: user.id,
          inviteKey: 'toolongerrorkey'
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('数据不全时应该返回400', function (done) {
      request.post('/users/validate')
        .send({
          inviteKey: 'toolongerrorkey'
        })
        .expect(400)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });


  });
};