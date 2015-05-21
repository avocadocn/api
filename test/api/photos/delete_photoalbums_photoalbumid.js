var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('delete /photo_albums/:photoAlbumId', function () {

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

    it('队长可以删除小队相册', function (done) {
      var photoAlbum = data[0].teams[0].photoAlbums[0];
      request.delete('/photo_albums/' + photoAlbum.id)
        .set('x-access-token', accessToken)
        .expect(204)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('队长不可以删除活动相册', function (done) {
      var campaign = data[0].campaigns[1];
      request.delete('/photo_albums/' + campaign.photo_album)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('不是队长不能删除小队相册', function (done) {
      var photoAlbum = data[0].teams[1].photoAlbums[0];
      request.delete('/photo_albums/' + photoAlbum.id)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        })
    });

    describe('hr删除相册', function () {

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

      it('hr可以删除小队相册', function (done) {
        var photoAlbum = data[0].teams[0].photoAlbums[1];
        request.delete('/photo_albums/' + photoAlbum.id)
          .set('x-access-token', accessToken)
          .expect(204)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('hr不可以删除活动相册', function (done) {
        var campaign = data[0].campaigns[1];
        request.delete('/photo_albums/' + campaign.photo_album)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('hr不能删除其它公司的小队相册', function (done) {
        var photoAlbum = data[1].teams[1].photoAlbums[0];
        request.delete('/photo_albums/' + photoAlbum.id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          })
      });


    });

  });
};

