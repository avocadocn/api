var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common.js');
var mongoose = common.mongoose;

module.exports = function () {
  describe('delete /photo_albums/:photoAlbumId/photos/:photoId', function () {

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

    var otherTeamToken;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[2];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          otherTeamToken = res.body.token;
          done();
        });
    });

    // 获取公司活动照片
    var resPhotos;
    before(function (done) {
      var data = dataService.getData();
      mongoose.model('Photo').find({
        photo_album: data[0].campaigns[1].photo_album,
        hidden: false
      }).limit(2).exec()
        .then(function (photos) {
          resPhotos = photos;
          done();
        })
        .then(null, function (err) {
          done(err);
        });
    });

    // 获取小队活动照片
    var teamPhotos;
    before(function (done) {
      var data = dataService.getData();
      mongoose.model('Photo').find({
        photo_album: data[0].teams[0].campaigns[0].photo_album,
        hidden: false
      }).limit(2).exec()
        .then(function (photos) {
          teamPhotos = photos;
          done();
        })
        .then(null, function (err) {
          done(err);
        });
    });

    // 获取其它公司的照片
    var otherCompanyPhotos;
    before(function (done) {
      var data = dataService.getData();
      mongoose.model('Photo').find({
        photo_album: data[1].campaigns[1].photo_album,
        hidden: false
      }).limit(2).exec()
        .then(function (photos) {
          otherCompanyPhotos = photos;
          done();
        })
        .then(null, function (err) {
          done(err);
        });
    });

    describe('删除照片测试', function () {

      var uploadUser;
      var uploadUserToken;
      before(function (done) {
        for (var i = 0; i < data[0].users.length; i++) {
          var user = data[0].users[i];
          if (user.id === resPhotos[0].upload_user._id.toString()) {
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

      it('上传者可以删除自己上传的照片', function (done) {
        var photoAlbumId = data[0].campaigns[1].photo_album;
        request.delete('/photo_albums/' + photoAlbumId + '/photos/' + resPhotos[0].id)
          .set('x-access-token', uploadUserToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('队长可以删除小队的照片', function (done) {
        var photoAlbumId = data[0].teams[0].campaigns[0].photo_album;
        request.delete('/photo_albums/' + photoAlbumId + '/photos/' + teamPhotos[0].id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('队长不可以删除其它小队的照片', function (done) {
        var photoAlbumId = data[0].teams[0].campaigns[0].photo_album;
        request.delete('/photo_albums/' + photoAlbumId + '/photos/' + teamPhotos[1].id)
          .set('x-access-token', otherTeamToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('公司成员不能删除其它公司的相册照片', function (done) {
        var photoAlbumId = data[1].campaigns[1].photo_album;
        request.delete('/photo_albums/' + photoAlbumId + '/photos/' + otherCompanyPhotos[0].id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      describe('hr删除相册照片', function () {
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

        it('hr可以删除公司相册的照片', function (done) {
          var photoAlbumId = data[0].campaigns[1].photo_album;
          request.delete('/photo_albums/' + photoAlbumId + '/photos/' + resPhotos[1].id)
            .set('x-access-token', uploadUserToken)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              done();
            });
        });

        it('hr不能删除其它公司的相册照片', function (done) {
          var photoAlbumId = data[1].campaigns[1].photo_album;
          request.delete('/photo_albums/' + photoAlbumId + '/photos/' + otherCompanyPhotos[1].id)
            .set('x-access-token', accessToken)
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

