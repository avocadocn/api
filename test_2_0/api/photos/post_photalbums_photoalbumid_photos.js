var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /photo_albums/:photoAlbumId/photos', function () {

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

    it('公司成员应该可以正常上传小队相册照片', function (done) {
      var photoAlbumId = data[0].teams[0].photoAlbums[2].id;

      request.post('/photo_albums/' + photoAlbumId + '/photos')
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('公司成员应该可以正常上传公司活动相册照片', function (done) {
      var photoAlbumId = data[0].campaigns[0].photo_album.toString();

      request.post('/photo_albums/' + photoAlbumId + '/photos')
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('公司成员应该可以正常上传小队活动相册照片', function (done) {
      var photoAlbumId = data[0].teams[0].campaigns[0].photo_album.toString();

      request.post('/photo_albums/' + photoAlbumId + '/photos')
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(201)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          done();
        });
    });

    it('上传非图片文件不会引起崩溃', function (done) {
      var photoAlbumId = data[0].teams[0].campaigns[0].photo_album.toString();

      request.post('/photo_albums/' + photoAlbumId + '/photos')
        .attach('photo', __dirname + '/test_photo.txt')
        .set('x-access-token', accessToken)
        .expect(500)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.msg.should.be.a.String;
          done();
        });
    });

    it('非公司成员不能上传照片', function (done) {
      var photoAlbumId = data[1].teams[0].campaigns[0].photo_album.toString();

      request.post('/photo_albums/' + photoAlbumId + '/photos')
        .attach('photo', __dirname + '/test_photo.png')
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

    describe('hr上传照片', function () {
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

      it('hr应该可以正常上传相册照片', function (done) {
        var photoAlbumId = data[0].teams[0].photoAlbums[2].id;

        request.post('/photo_albums/' + photoAlbumId + '/photos')
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', accessToken)
          .expect(201)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            done();
          });
      });

      it('hr不能上传照片到其它公司相册', function (done) {
        var photoAlbumId = data[1].teams[0].campaigns[0].photo_album.toString();

        request.post('/photo_albums/' + photoAlbumId + '/photos')
          .attach('photo', __dirname + '/test_photo.png')
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

