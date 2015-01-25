var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var common = require('../../support/common');
var mongoose = common.mongoose;

var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var chance = require('chance').Chance();

module.exports = function () {
  // var data;

  // before(function (done) {
  //   data = dataService.getData();
  //   var user = data[0].users[0];
  //   request.post('/users/login')
  //     .send({
  //       email: user.email,
  //       password: '55yali'
  //     })
  //     .expect(200)
  //     .end(function (err, res) {
  //       if (err) {
  //         console.log(res.body);
  //         return done(err);
  //       }
  //       accessToken = res.body.token;
  //       done();
  //     });
  // })

  // describe('post /comments/host_type/:hostType/host_id/:hostId', function() {

  //   var publishCommentSuccessTest = function(theme, index) {
  //     var title = util.format('本公司用户在%s中应能发表不带图评论',theme);
  //     var hostId ;
  //     switch(index) {
  //       case 1:
  //         hostId = ;
  //         break;
  //       // case 2:
  //       //   hostId = ;
  //       // case 3:
  //       //   hostId = ;
  //       //   break;
  //       // case 4:
  //       //   hostId = ;
  //       //   break;
  //       // case 5:
  //       //   hostId = ;
  //       //   break;
  //     }
  //     it('本公司用户在单队活动应能发表一般评论,', function (done) {
  //       request.post('/comments/host_type/:campaign/host_id/:'+hostId)
  //         .send({content:chance.string()})
  //         .expect(200)
  //         .end(function (err,res) {
  //           if(err) return done(err);
  //           //campaign的lastComment应该更新了
  //           //数据库中应有此comment
  //           //公司里参加此小队的人commentCampaigns列表里应有此活动
  //           //公司里未参加此小队的人unjoinedCommentCampaigns列表里应有此活动
  //         })

  //     });
  //   }
  //   publishCommentSuccessTest('单队活动',1);
    // publishCommentSuccessTest('公司活动',2);
    // publishCommentSuccessTest('公司内挑战',3);
    // publishCommentSuccessTest('本公司参与公司外挑战',4);


    // it('本公司用户应能发表带图无字评论', function (done) {

    // });

    // it('本公司用户应能发表带图带字评论', function (done) {

    // })



    // it('hr应不能发表评论', function (done) {

    // })

    // it('非本公司成员应不能在公司活动/小队活动/发表评论', function (done) {

    // })

    // it('本公司成员应不能在本公司未参与公司外挑战发表评论', function (done) {

    // })


  // });
};