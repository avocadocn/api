var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('put /users/:userId', function () {

    var accessToken;
    before(function (done) {
      var data = dataService.getData();
      var user = data[0].users[8];

      request.post('/users/login')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          accessToken = res.body.token;
          done();
        });
    });

    it('用户可以正常修改自己的信息', function (done) {
      var data = dataService.getData();
      var user = data[0].users[8];

      request.put('/users/' + user.id)
        .send({
          nickname: 'updateNickname',
          originPassword: '55yali',
          password: '55yali',
          realname: 'updateRealname',
          introduce: 'updateIntro',
          phone: '12345678901',
          qq: '123456789',
          birthday: '1991-01-01',
          tag: 'tag',
          sex: '男',
          pushToggle: true
        })
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          done();
        });

    });

    it('如果原密码错误，则禁止修改密码', function (done) {
      var data = dataService.getData();
      var user = data[0].users[8];

      request.put('/users/' + user.id)
        .send({
          originPassword: '55',
          password: '55yali'
        })
        .set('x-access-token', accessToken)
        .expect(400)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    // it('用户不能修改同公司其它用户的信息', function (done) {
    //   var data = dataService.getData();
    //   var otherUser = data[0].users[0];

    //   request.put('/users/' + otherUser.id)
    //     .send({
    //       nickname: 'updateNickname'
    //     })
    //     .set('x-access-token', accessToken)
    //     .expect(403)
    //     .end(function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       done();
    //     });
    // });

    // it('用户不能修改其它公司用户的信息', function (done) {
    //   var data = dataService.getData();
    //   var otherUser = data[1].users[0];

    //   request.put('/users/' + otherUser.id)
    //     .send({
    //       nickname: 'updateNickname'
    //     })
    //     .set('x-access-token', accessToken)
    //     .expect(403)
    //     .end(function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       done();
    //     });
    // });

    it('修改头像', function (done) {
      var data = dataService.getData();
      var user = data[0].users[8];
      request.put('/users/' + user.id)
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('修改头像时如果提供不正确的表单名应该被忽略，返回200', function (done) {
      var data = dataService.getData();
      var user = data[0].users[8];

      request.put('/users/' + user.id)
        .attach('errorPhoto', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          done();
        });
    });

    it('修改头像时如果上传非图像文件应该提示错误信息，不引起服务器崩溃', function (done) {
      var data = dataService.getData();
      var user = data[0].users[8];

      request.put('/users/' + user.id)
        .attach('photo', __dirname + '/test_photo.txt')
        .set('x-access-token', accessToken)
        .expect(500)
        .end(function (err, res) {
          if (err) {
            return done(err);
          }
          res.body.msg.should.equal('服务器错误');
          done();
        });
    });

  });

};