var app = require('../../../config/express.js'),
  request = require('supertest')(app);
var dataService = require('../../create_data');
var async = require('async');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  describe('get /users/concern/:userId', function() {
    var user, userToken;
    before(function (done) {
      var data = dataService.getData();
      user = data[0].users[0];
      request.post('/users/login')
      .send({
        phone: user.phone,
        password: '55yali'
      })
      .end(function (err, res) {
        if (res.statusCode === 200) {
          userToken = res.body.token;
        }
        done(err);
      });        
    });

    it('用户能获取自己的关注列表', function(done) {
      request.get('/users/concern/'+user._id)
      .set('x-access-token', userToken)
      .expect(200)
      .end(function (err, res) {
        if(err) return done(err);
        res.body.should.have.length(4);
        done();
      });
    });

  })
}