var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common.js');
var mongoose = common.mongoose;

module.exports = function () {
  describe('get /photo_albums/:photoAlbumId/photos/:photoId', function () {

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

    var resPhoto;
    before(function (done) {
      var data = dataService.getData();
      mongoose.model('Photo').findOne({
        photo_album: data[0].campaigns[0].photo_album,
        hidden: false
      }).exec()
        .then(function (photo) {
          if (!photo) {
            done('没有找到测试用的照片');
          } else {
            resPhoto = photo;
            done();
          }
        })
        .then(null, function (err) {
          done(err);
        });
    });

    var otherResPhoto;
    before(function (done) {
      var data = dataService.getData();
      mongoose.model('Photo').findOne({
        photo_album: data[1].campaigns[0].photo_album,
        hidden: false
      }).exec()
        .then(function (photo) {
          if (!photo) {
            done('没有找到第2个公司测试用的照片');
          } else {
            otherResPhoto = photo;
            done();
          }
        })
        .then(null, function (err) {
          done(err);
        });
    });

    it('公司成员应该可以正常获取相册照片', function (done) {
      var photoAlbumId = data[0].campaigns[0].photo_album;
      request.get('/photo_albums/' + photoAlbumId + '/photos/' + resPhoto.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          var photo = res.body;
          photo._id.should.equal(resPhoto.id);
          photo.uri.should.equal(resPhoto.uri);
          photo.name.should.equal(resPhoto.name);
          photo.uploadUser._id.should.equal(resPhoto.upload_user._id.toString());
          photo.uploadUser.name.should.equal(resPhoto.upload_user.name);
          photo.uploadUser.type.should.equal(resPhoto.upload_user.type);
          (new Date(photo.uploadDate).valueOf()).should.equal(resPhoto.upload_date.valueOf());
          done();
        });
    });

    it('公司成员不应该获取其它公司的相册照片', function (done) {
      var photoAlbumId = data[1].campaigns[0].photo_album;
      request.get('/photo_albums/' + photoAlbumId + '/photos/' + otherResPhoto.id)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
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

      it('hr应该可以正常获取相册照片', function (done) {
        var photoAlbumId = data[0].campaigns[0].photo_album;
        request.get('/photo_albums/' + photoAlbumId + '/photos/' + resPhoto.id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            var photo = res.body;
            photo._id.should.equal(resPhoto.id);
            photo.uri.should.equal(resPhoto.uri);
            photo.name.should.equal(resPhoto.name);
            photo.uploadUser._id.should.equal(resPhoto.upload_user._id.toString());
            photo.uploadUser.name.should.equal(resPhoto.upload_user.name);
            photo.uploadUser.type.should.equal(resPhoto.upload_user.type);
            (new Date(photo.uploadDate).valueOf()).should.equal(resPhoto.upload_date.valueOf());
            done();
          });
      });

      it('hr不应该获取其它公司的相册照片', function (done) {
        var photoAlbumId = data[1].campaigns[0].photo_album;
        request.get('/photo_albums/' + photoAlbumId + '/photos/' + otherResPhoto.id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

    });


  });

};

