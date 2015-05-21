var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /photo_albums', function () {

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

    it('公司成员可以获取小队相册列表', function (done) {
      var team = data[0].teams[0].model;
      request.get('/photo_albums?ownerType=team&ownerId=' + team.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.be.an.Array;
          res.body.forEach(function (photoAlbum) {
            photoAlbum._id.should.be.a.String;
            photoAlbum.name.should.be.a.String;
            photoAlbum.createDate.should.be.a.Date;
            photoAlbum.updateDate.should.be.a.Date;
            photoAlbum.photoCount.should.be.a.Number;
            photoAlbum.latestPhotos.should.be.an.Array;
            photoAlbum.latestPhotos.forEach(function (photo) {
              photo._id.should.be.a.String;
              photo.uri.should.be.a.String;
            });
          });
          done();
        })
    });

    it('非公司成员不可以获取小队相册列表', function (done) {
      var team = data[1].teams[0].model;
      request.get('/photo_albums?ownerType=team&ownerId=' + team.id)
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        })
    });

    describe('hr获取小队相册列表', function () {

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

      it('hr可以获取小队相册列表', function (done) {
        var team = data[0].teams[0].model;
        request.get('/photo_albums?ownerType=team&ownerId=' + team.id)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.be.an.Array;
            res.body.forEach(function (photoAlbum) {
              photoAlbum._id.should.be.a.String;
              photoAlbum.name.should.be.a.String;
              photoAlbum.createDate.should.be.a.Date;
              photoAlbum.updateDate.should.be.a.Date;
              photoAlbum.photoCount.should.be.a.Number;
              photoAlbum.latestPhotos.should.be.an.Array;
              photoAlbum.latestPhotos.forEach(function (photo) {
                photo._id.should.be.a.String;
                photo.uri.should.be.a.String;
              });
            });
            done();
          })
      });

      it('hr不可以获取其它公司小队的相册列表', function (done) {
        var team = data[1].teams[0].model;
        request.get('/photo_albums?ownerType=team&ownerId=' + team.id)
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

