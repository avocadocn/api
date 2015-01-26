var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common.js');
var mongoose = common.mongoose;

module.exports = function () {
  describe('put /photo_albums/:photoAlbumId/photos/:photoId', function () {

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

    describe('修改照片信息测试', function () {

      var uploadUser;
      var uploadUserToken;
      before(function (done) {
        for (var i = 0; i < data[0].users.length; i++) {
          var user = data[0].users[i];
          if (user.id === resPhoto.upload_user._id.toString()) {
            uploadUser = user;
            break;
          }
        }
        request.post('/users/login')
          .send({
            email: uploadUser.email,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            uploadUserToken = res.body.token;
            done();
          });
      });

      it('上传者可以修改自己上传的照片', function (done) {
        var photoAlbumId = data[0].campaigns[0].photo_album;
        request.put('/photo_albums/' + photoAlbumId + '/photos/' + resPhoto.id)
          .set('x-access-token', accessToken)
          .send({ name: 'testPhotoName' })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('队长可以修改自己上传的照片', function (done) {
        var photoAlbumId = data[0].campaigns[0].photo_album;
        request.put('/photo_albums/' + photoAlbumId + '/photos/' + resPhoto.id)
          .set('x-access-token', uploadUserToken)
          .send({ name: 'testPhotoName' })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('公司成员不能修改其它公司的相册照片', function (done) {
        var photoAlbumId = data[1].campaigns[0].photo_album;
        request.put('/photo_albums/' + photoAlbumId + '/photos/' + otherResPhoto.id)
          .set('x-access-token', accessToken)
          .send({ name: 'testPhotoName' })
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      describe('hr修改相册照片', function () {
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

        it('hr可以修改公司相册的照片', function (done) {
          var photoAlbumId = data[0].campaigns[0].photo_album;
          request.put('/photo_albums/' + photoAlbumId + '/photos/' + resPhoto.id)
            .set('x-access-token', uploadUserToken)
            .send({ name: 'testPhotoName' })
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              done();
            });
        });

        it('hr不能修改其它公司的相册照片', function (done) {
          var photoAlbumId = data[1].campaigns[0].photo_album;
          request.put('/photo_albums/' + photoAlbumId + '/photos/' + otherResPhoto.id)
            .set('x-access-token', accessToken)
            .send({ name: 'testPhotoName' })
            .expect(403)
            .end(function (err, res) {
              if (err) return done(err);
              done();
            });
        });

      });


    });



  });
};

