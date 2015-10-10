var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');

module.exports = function () {

  describe('get /users/:userId', function () {

    var accessToken, data, user;
    before(function (done) {
      data = dataService.getData();
      user = data[0].users[0];

      request.post('/users/login')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          accessToken = res.body.token;
          done();
        });
    });

    it('用户应该获取到自己的完整信息', function (done) {
      request.get('/users/' + user.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          var resUser = res.body;
          resUser._id.should.equal(user.id);
          resUser.nickname.should.equal(user.nickname);
          resUser.photo.should.equal(user.photo);
          resUser.realname.should.equal(user.realname);
          resUser.gender.should.equal(user.gender);
          (new Date(resUser.birthday).valueOf()).should.equal(user.birthday.valueOf());
          (new Date(resUser.registerDate).valueOf()).should.equal(user.register_date.valueOf());
          resUser.phone.should.equal(user.phone);
          resUser.company._id.should.equal(user.cid.toString());
          resUser.company.name.should.equal(user.company_official_name);
          resUser.company.briefName.should.equal(user.cname);
          resUser.tids.should.be.ok;
          done();
        });
    });

    it('用户可以只获取免打扰开关', function (done) {
      request.get('/users/' + user.id + '?responseKey=pushToggle')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          res.body.pushToggle.should.equal(user.push_toggle);
          done();
        });
    });

    it('应该正常获取到公司其它成员的信息', function (done) {
      var otherUser = data[0].users[1];
      request.get('/users/' + otherUser.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          var resUser = res.body;
          resUser._id.should.equal(otherUser.id);
          resUser.nickname.should.equal(otherUser.nickname);
          resUser.photo.should.equal(otherUser.photo);
          resUser.realname.should.equal(otherUser.realname);
          resUser.gender.should.equal(otherUser.gender);
          (new Date(resUser.birthday).valueOf()).should.equal(otherUser.birthday.valueOf());
          resUser.phone.should.equal(otherUser.phone);
          resUser.company._id.should.equal(otherUser.cid.toString());
          resUser.company.name.should.equal(otherUser.company_official_name);
          resUser.company.briefName.should.equal(otherUser.cname);
          resUser.tids.should.be.ok;
          done();
        });
    });

    it('获取其它公司的成员的信息应该只获取到简略信息', function (done) {
      var otherUser = data[1].users[0];
      request.get('/users/' + otherUser.id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          var resUser = res.body;
          resUser._id.should.equal(otherUser.id);
          resUser.nickname.should.equal(otherUser.nickname);
          resUser.photo.should.equal(otherUser.photo);
          for (var key in resUser) {
            '_id nickname photo'.indexOf(key).should.not.equal(-1);
          }
          done();
        });
    });

    // it('获取某活动的未读评论数应获取到此活动的数目', function (done) {
    //   request.get('/users/' + user.id )
    //     .query({commentCampaignId : data[0].campaigns[0]._id})
    //     .set('x-access-token', accessToken)
    //     .expect(200)
    //     .end(function (err, res) {
    //       if (err) {
    //         console.log(res.body);
    //         return done(err);
    //       }
    //       res.body.unreadNumbers.should.be.a.Number;
    //       done();
    //     });
    // });

  });

};