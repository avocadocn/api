var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('get /interaction', function () {
    var accessToken;
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[1].users[0];
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
        if(queryData.userId===1) {
          queryData.userId = data[1].users[1].id;
        }
        else if(queryData.userId===2) {
          queryData.userId = data[1].users[2].id;
        }
        request.get('/interaction')
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
    getInteractionTest("应该成功获取自己所有互动",{interactionType:4},10)
    getInteractionTest("应该成功获取自己所有活动",{interactionType:1},10)
    getInteractionTest("应该成功获取自己所有投票",{interactionType:2},10)
    getInteractionTest("应该成功获取自己所有求助",{interactionType:3},10)
    getInteractionTest("应该成功获取其他人所有互动",{interactionType:4,userId:1},10)
    getInteractionTest("获取私有群互动应该获取不到",{interactionType:1,userId:2},4)
    it("获取其他公司人员互动应该返回403", function (done) {
      request.get('/interaction')
        .set('x-access-token', accessToken)
        .query({interactionType:4,userId:data[0].users[0].id})
        .expect(403)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.should.be.instanceof(Object);
          done();
        });
    });
    it("获取错误用户的互动应该返回500", function (done) {
      request.get('/interaction')
        .set('x-access-token', accessToken)
        .query({interactionType:4,userId:"lakfkjsdjl"})
        .expect(500)
        .end(function (err, res) {
          if (err){
            return done(err);
          }
          res.body.should.be.instanceof(Object);
          done();
        });
    });
  })
}











