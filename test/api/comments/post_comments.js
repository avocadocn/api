var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var chance = require('chance').Chance();
var async = require('async');

module.exports = function () {
  var data, userToken, userToken2, hrToken;

  before(function (done) {
    data = dataService.getData();
    
    
    
    async.parallel([
      function(callback) {
        //第一个公司的第一个人
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
            callback();
          });
      },
      function(callback) {
        //第三个公司的第一个人
        var user2 = data[2].users[0];
        request.post('/users/login')
          .send({
            email: user2.email,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if (err) {
              console.log(res.body);
              return done(err);
            }
            userToken2 = res.body.token;
            callback();
          });
      },
      function(callback) {
        //第一个公司的hr
        var company = data[0].model;
        request.post('/companies/login')
          .send({
            username: company.username,
            password: '55yali'
          })
          .expect(200)
          .end(function (err, res) {
            if(err) {
              console.log(res.body);
              return done(err);
            }
            hrToken = res.body.token;
            callback();
          })
      }
    ],function(err, results) {
      if(err) return done(err);
      else done();
    })
  })

  describe('post /comments/host_type/:hostType/host_id/:hostId', function() {
    describe('本公司成员',function() {
      var publishCommentSuccessTest = function(theme, index) {
        var title = util.format('本公司用户在%s中应能发表不带图评论',theme);
        it(title, function (done) {
          var hostId ;
          switch(index) {
            case 1:
              hostId = data[0].teams[0].campaigns[0]._id;
              break;
            case 2:
              hostId = data[0].campaigns[0]._id;
              break;
            case 3:
              hostId = data[0].teams[1].campaigns[0]._id;
              break;
            case 4:
              hostId = data[0].teams[0].campaigns[8]._id;
              break;
          }
          var content = chance.string();
          request.post('/comments/host_type/campaign/host_id/' + hostId)
            .set('x-access-token', userToken)
            .send({content: content})
            .expect(200)
            .end(function (err,res) {
              if(err) return done(err);
              //下面这些不需要测了……
              //campaign的lastComment应该更新了
              //数据库中应有此comment,其host_id为hostId,发布者为此user
              //公司里参加此小队的人commentCampaigns列表里应有此活动
              //公司里未参加此小队的人unjoinedCommentCampaigns列表里应有此活动
              res.body.comment.content.should.equal(content);
              done();
            })

        });
      }
      publishCommentSuccessTest('单队活动',1);
      publishCommentSuccessTest('公司活动',2);
      publishCommentSuccessTest('公司内挑战',3);
      publishCommentSuccessTest('本公司参与公司外挑战',4);


      it('本公司用户应能发表带图无字评论', function (done) {
        var hostId = data[0].campaigns[0]._id;
        request.post('/comments/host_type/campaign/host_id/' + hostId)
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .expect(200)
          .end(function (err,res) {
            if(err) return done(err);
            done();
          })
      });

      it('本公司用户应能发表带图带字评论', function (done) {
        var hostId = data[0].campaigns[0]._id;
        request.post('/comments/host_type/campaign/host_id/' + hostId)
          .attach('photo', __dirname + '/test_photo.png')
          .set('x-access-token', userToken)
          .send({content:chance.string(),randomId:[0]})
          .expect(200)
          .end(function (err,res) {
            if(err) return done(err);
            done();
          })
      });

      it('本公司用户应不能上传非图像文件', function (done) {
        var hostId = data[0].campaigns[0]._id;
        request.post('/comments/host_type/campaign/host_id/' + hostId)
          .attach('photo', __dirname + '/test_photo.txt')
          .set('x-access-token', userToken)
          .send({content:chance.string(),randomId:[0]})
          .expect(500)
          .end(function (err,res) {
            if(err) return done(err);
            done();
          })
      });
    });

    describe('hr', function() {
      it('hr应不能发表评论', function (done) {
        var hostId = data[0].campaigns[0]._id;
        request.post('/comments/host_type/:campaign/host_id/:' + hostId)
          .set('x-access-token', hrToken)
          .send({content:chance.string()})
          .expect(403)
          .end(function (err,res) {
            if(err) return done(err);
            done();
          })
      });
    })

    describe('非本公司成员', function() {
      var publishCommentFailTest = function(theme, index) {
        var title = util.format('非本公司成员应不能在%s发表评论', theme);
        it(title, function (done) {
          var hostId ;
          switch(index) {
            case 1:
              hostId = data[0].campaigns[0]._id;
              break;
            case 2:
              hostId = data[0].teams[0].campaigns[0]._id;
              break;
            case 3:
              hostId = data[0].teams[1].campaigns[0]._id;
              break;
            case 4:
              hostId = data[0].teams[0].campaigns[8]._id;
              break;
          }
          request.post('/comments/host_type/:campaign/host_id/:' + hostId)
            .set('x-access-token', userToken2)
            .send({content:chance.string()})
            .expect(403)
            .end(function (err,res) {
              if(err) return done(err);
              done();
            })
        })
      };

      publishCommentFailTest('公司活动', 1);
      publishCommentFailTest('小队活动', 2);
      publishCommentFailTest('公司内挑战', 3);
      publishCommentFailTest('其公司未参加的公司外挑战', 4);

    })
  });
};
