var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /photo_albums/:photoAlbumId', function () {

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

    it('公司成员可以获取某个相册的详情', function (done) {
      var campaign = data[0].campaigns[0];
      request.get('/photo_albums/' + campaign.photo_album)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          var photoAlbum = res.body;
          photoAlbum._id.should.equal(campaign.photo_album.toString());
          photoAlbum.owner.model._id.should.equal(campaign.id);
          photoAlbum.owner.model.type.should.equal('Campaign');
          var cidList = [];
          campaign.cid.forEach(function (cid) {
            cidList.push(cid.toString());
          });
          photoAlbum.owner.companies.should.eql(cidList);
          photoAlbum.name.should.be.a.String;
          photoAlbum.updateDate.should.be.a.Date;
          photoAlbum.updateUser._id.should.be.a.String;
          photoAlbum.updateUser.name.should.be.a.String;
          photoAlbum.updateUser.type.should.be.a.String;
          photoAlbum.photoCount.should.be.a.Number;
          done();
        });
    });

    it('非公司成员不可以获取相册详细', function (done) {
      var campaign = data[1].campaigns[0];
      request.get('/photo_albums/' + campaign.photo_album)
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

      it('hr可以获取某个相册的详情', function (done) {
        var campaign = data[0].campaigns[0];
        request.get('/photo_albums/' + campaign.photo_album)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            var photoAlbum = res.body;
            photoAlbum._id.should.equal(campaign.photo_album.toString());
            photoAlbum.owner.model._id.should.equal(campaign.id);
            photoAlbum.owner.model.type.should.equal('Campaign');
            var cidList = [];
            campaign.cid.forEach(function (cid) {
              cidList.push(cid.toString());
            });
            photoAlbum.owner.companies.should.eql(cidList);
            photoAlbum.name.should.be.a.String;
            photoAlbum.updateDate.should.be.a.Date;
            photoAlbum.updateUser._id.should.be.a.String;
            photoAlbum.updateUser.name.should.be.a.String;
            photoAlbum.updateUser.type.should.be.a.String;
            photoAlbum.photoCount.should.be.a.Number;
            done();
          });
      });

      it('hr不可以获取其它公司的相册详细', function (done) {
        var campaign = data[1].campaigns[0];
        request.get('/photo_albums/' + campaign.photo_album)
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

