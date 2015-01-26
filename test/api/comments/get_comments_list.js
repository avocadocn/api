var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');

module.exports = function () {
  var data, userToken, hrToken;
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
        if (err) {
          console.log(res.body);
          return done(err);
        }
        userToken = res.body.token;
      });
    request.post('/companies/login')
      .send({
        username: data[0].model.username,
        password: '55yali'
      })
      .expect(200)
      .end(function (err, res) {
        if (err) {
          console.log(res.body);
          return done(err);
        }
        hrToken = res.body.token;
        done();
      });
  });

  describe('get /comments/list', function() {
    var getListSuccessTest = function (theme, index) {
      var title = util.format('用户获取个人%s小队的评论列表应返回200', theme);
      it(title, function (done) {
        request.get('/comments/list')
          .query({type:index===1?'joined':'unjoined'})
          .set('x-access-token', userToken)
          .expect(200)
          .end(function (err, res) {
            if(err) return done(err);
            res.body.commentCampaigns.length.should.be.above(-1);
            done();
          });
      });
    };
    getListSuccessTest('已参加', 1);
    getListSuccessTest('未参加', 2);

    it('HR获取个人评论列表应返回403', function (done) {
      request.get('/comments/list')
        .query({type:'joined'})
        .set('x-access-token', hrToken)
        .expect(403)
        .end(function (err, res) {
          if(err) return done(err);
          done();
        });
    });
  })
};
