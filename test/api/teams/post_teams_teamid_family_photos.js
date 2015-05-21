var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var util = require('util');
var async = require('async');
//本公司可以，其它公司的不可

module.exports = function() {

  describe('post /teams/:teamId/family_photos', function () {
    var data,
      tokens = {};

    before(function (done) {
      data = dataService.getData();
      request.post('/users/login')
        .send({
          email: data[0].users[0].email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          tokens.leader = res.body.token;
          done();
        });
    });
    before(function (done) {
      data = dataService.getData();
      request.post('/users/login')
        .send({
          email: data[0].users[1].email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          tokens.member = res.body.token;
          done();
        });
    });
    before(function (done) {
      data = dataService.getData();
      request.post('/users/login')
        .send({
          email: data[1].users[0].email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          tokens.otherCompanyMember = res.body.token;
          done();
        });
    });
    before(function (done) {
      data = dataService.getData();
      request.post('/companies/login')
        .send({
          username: data[0].model.username,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          tokens.hr = res.body.token;
          done();
        });
    });

    it('队长可以上传小队全家福', function (done) {
      request.post('/teams/' + data[0].teams[0].model.id + '/family_photos')
        .set('x-access-token', tokens.leader)
        .attach('photo', __dirname + '/test_family.jpg')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('成员不可以上传小队全家福', function (done) {
      request.post('/teams/' + data[0].teams[0].model.id + '/family_photos')
        .set('x-access-token', tokens.member)
        .attach('photo', __dirname + '/test_family.jpg')
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('其它公司成员不可以上传小队全家福', function (done) {
      request.post('/teams/' + data[0].teams[0].model.id + '/family_photos')
        .set('x-access-token', tokens.otherCompanyMember)
        .attach('photo', __dirname + '/test_family.jpg')
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('hr可以上传小队全家福', function (done) {
      request.post('/teams/' + data[0].teams[0].model.id + '/family_photos')
        .set('x-access-token', tokens.hr)
        .attach('photo', __dirname + '/test_family.jpg')
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

  });
};