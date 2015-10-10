var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('get /interaction/template', function () {
    var accessToken;
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[0];
      request.post('/users/login')
        .send({
          phone: user.phone,
          password: '55yali'
        })
        .end(function (err, res) {
          if (err) return done(err);
          if (res.statusCode === 200) {
            accessToken = res.body.token;
          }
          done();
        });
    });
    var getInteractionTest = function (msg, queryData, expectLength) {
      it(msg, function (done) {
        request.get('/interaction/template')
          .set('x-access-token', accessToken)
          .query(queryData)
          .expect(200)
          .end(function (err, res) {
            if (err){
              return done(err);
            }
            res.body.should.be.instanceof(Array);
            expectLength!=undefined && res.body.should.be.instanceof(Array).and.have.lengthOf(expectLength);
            done();
          });
      });
    };
    getInteractionTest("应该成功获取活动模板",{templateType:1},1)
    getInteractionTest("应该成功获取投票模板",{templateType:2},1)
    getInteractionTest("应该成功获取求助模板",{templateType:3},1)
    it("获取错误类型模板应该返回400", function (done) {
      request.get('/interaction/template')
        .set('x-access-token', accessToken)
        .query({templateType:4,userId:data[1].users[0].id})
        .expect(400)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.msg.should.equal("互动类型错误");
          done();
        });
    });
  })
}











