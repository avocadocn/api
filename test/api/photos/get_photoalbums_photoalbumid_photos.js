var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /photo_albums/:photoAlbumId/photos', function () {

    var data;
    var accessToken;
    before(function (done) {
      data = dataService.getData();

      var user = data[0].users[0];
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

    it('公司成员应该可以正常获取小队相册照片', function (done) {
      var photoAlbumId = data[0].teams[0].photoAlbums[2].id;

      request.get('/photo_albums/' + photoAlbumId + '/photos')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          var photos = res.body;
          photos.forEach(function (photo) {
            photo._id.should.be.a.String;
            photo.uri.should.be.a.String;
            photo.width.should.be.a.Number;
            photo.height.should.be.a.Number;
            photo.name.should.be.a.String;
            photo.uploadUser._id.should.be.a.String;
            photo.uploadUser.name.should.be.a.String;
            photo.uploadUser.type.should.be.a.String;
            photo.uploadDate.should.be.a.Date;
          });
          done();
        });
    });

    it('公司成员应该可以正常获取公司活动相册照片', function (done) {
      var photoAlbumId = data[0].campaigns[0].photo_album.toString();

      request.get('/photo_albums/' + photoAlbumId + '/photos')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('公司成员应该可以正常获取小队活动相册照片', function (done) {
      var photoAlbumId = data[0].teams[0].campaigns[0].photo_album.toString();

      request.get('/photo_albums/' + photoAlbumId + '/photos')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('公司成员不能获取其它公司的相册照片', function (done) {
      var photoAlbumId = data[1].teams[0].campaigns[0].photo_album.toString();

      request.get('/photo_albums/' + photoAlbumId + '/photos')
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    describe('hr获取相册照片', function () {
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

      it('hr应该可以正常获取小队相册照片', function (done) {
        var photoAlbumId = data[0].teams[0].photoAlbums[2].id;

        request.get('/photo_albums/' + photoAlbumId + '/photos')
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            var photos = res.body;
            photos.forEach(function (photo) {
              photo._id.should.be.a.String;
              photo.uri.should.be.a.String;
              photo.width.should.be.a.Number;
              photo.height.should.be.a.Number;
              photo.name.should.be.a.String;
              photo.uploadUser._id.should.be.a.String;
              photo.uploadUser.name.should.be.a.String;
              photo.uploadUser.type.should.be.a.String;
              photo.uploadDate.should.be.a.Date;
            });
            done();
          });
      });

      it('hr不能获取其它公司的相册照片', function (done) {
        var photoAlbumId = data[1].teams[0].campaigns[0].photo_album.toString();

        request.get('/photo_albums/' + photoAlbumId + '/photos')
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            done();
          });
      });


    });

  });
};

