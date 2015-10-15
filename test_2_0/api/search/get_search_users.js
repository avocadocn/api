var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {

  var data,token;

  before(function (done) {
    data = dataService.getData();
    var user = data[0].users[0];
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
        token = res.body.token;
        done();
      });
  })

  describe('get /search/users', function() {
    // 根据名字查找
    it('根据名字查找用户应该得到正确返回', function (done) {
      var user = data[0].users[1];
      request.get('/search/users')
        .set('x-access-token', token)
        .query({name:user.nickname})
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.length.should.be.above(0);
          //该用户应该在返回的列表
          var index = tools.arrayObjectIndexOf(res.body, user.id ,'_id');
          index.should.be.above(-1);
          done();
        });
    });
    //根据email查找
    it('未登录用户无法根据名字查找用户', function (done) {
      var user = data[0].users[1];
      request.get('/search/users')
        .query({name:user.nickname})
        .expect(401)
        .end(function (err, res) {
          if (err) return done(err);
          done();
        });

    });
  });

};