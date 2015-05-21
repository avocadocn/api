var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /photo_albums', function () {

    var data;
    before(function () {
      data = dataService.getData();
    });

    describe('队长创建相册', function () {

      var accessToken;

      before(function (done) {
        var leader = data[0].teams[0].leaders[0];
        request.post('/users/login')
          .send({
            email: leader.email,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            accessToken = res.body.token;
            done();
          });
      });

      it('队长可以创建相册', function (done) {
        var company = data[0].model;
        var team = data[0].teams[0].model;

        request.post('/photo_albums')
          .set('x-access-token', accessToken)
          .send({
            cid: company.id,
            tid: team.id,
            name: 'testPhotoAlbum'
          })
          .expect(201)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

      it('缺少相册名称时无法创建相册', function (done) {
        var company = data[0].model;
        var team = data[0].teams[0].model;

        request.post('/photo_albums')
          .set('x-access-token', accessToken)
          .send({
            cid: company.id,
            tid: team.id
          })
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.be.a.String;
            done();
          });
      });

      it('缺少公司id时无法创建相册', function (done) {
        var team = data[0].teams[0].model;

        request.post('/photo_albums')
          .set('x-access-token', accessToken)
          .send({
            tid: team.id,
            name: 'testPhotoAlbum'
          })
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.be.a.String;
            done();
          });
      });

      it('缺少小队id时无法创建相册', function (done) {
        var company = data[0].model;

        request.post('/photo_albums')
          .set('x-access-token', accessToken)
          .send({
            cid: company.id,
            name: 'testPhotoAlbum'
          })
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.be.a.String;
            done();
          });
      });



    });

    describe('用户创建相册', function () {
      var accessToken;

      before(function (done) {
        var user = data[0].users[1];
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

      it('用户不能创建相册', function (done) {
        var company = data[0].model;
        var team = data[0].teams[0].model;

        request.post('/photo_albums')
          .set('x-access-token', accessToken)
          .send({
            cid: company.id,
            tid: team.id,
            name: 'testPhotoAlbum'
          })
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });

    });

    describe('hr创建相册', function () {
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

      it('hr可以创建相册', function (done) {
        var company = data[0].model;
        var team = data[0].teams[0].model;

        request.post('/photo_albums')
          .set('x-access-token', accessToken)
          .send({
            cid: company.id,
            tid: team.id,
            name: 'testPhotoAlbum'
          })
          .expect(201)
          .end(function (err, res) {
            if (err) return done(err);
            done();
          });
      });
    });

  });
};

