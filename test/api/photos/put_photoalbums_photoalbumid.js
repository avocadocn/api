var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('put /photo_albums/:photoAlbumId', function () {

    var data;
    var accessToken;
    before(function (done) {
      data = dataService.getData();

      var user = data[0].teams[0].leaders[0];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          accessToken = res.body.token;
          done();
        });

    });

    it('队长可以编辑小队相册', function (done) {
      var campaign = data[0].teams[0].campaigns[0];
      request.put('/photo_albums/' + campaign.photo_album)
        .set('x-access-token', accessToken)
        .send({
          name: 'otherName'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('队长不可以编辑公司活动相册', function (done) {
      var campaign = data[0].campaigns[0];
      request.put('/photo_albums/' + campaign.photo_album)
        .set('x-access-token', accessToken)
        .send({
          name: 'otherName'
        })
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('不是队长不能编辑小队相册', function (done) {
      var campaign = data[0].teams[1].campaigns[0];
      request.put('/photo_albums/' + campaign.photo_album)
        .set('x-access-token', accessToken)
        .send({
          name: 'otherName'
        })
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        })
    });

    describe('hr编辑相册', function () {

      var accessToken;
      before(function (done) {
        var company = data[0].model;
        request.post('/companies/login')
          .send({
            username: company.username,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            accessToken = res.body.token;
            done();
          });

      });

      it('hr可以编辑公司活动相册', function (done) {
        var campaign = data[0].campaigns[0];
        request.put('/photo_albums/' + campaign.photo_album)
          .send({
            name: 'otherName'
          })
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('hr可以编辑小队活动相册', function (done) {
        var campaign = data[0].teams[0].campaigns[0];
        request.put('/photo_albums/' + campaign.photo_album)
          .send({
            name: 'otherName'
          })
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('hr不可以编辑其它公司的相册', function (done) {
        var campaign = data[1].campaigns[0];
        request.put('/photo_albums/' + campaign.photo_album)
          .set('x-access-token', accessToken)
          .send({
            name: 'otherName'
          })
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          })
      });


    });

  });
};

