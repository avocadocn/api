var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var async = require('async');

module.exports = function () {
  var data, userToken, hrToken;
  userToken =[];
  hrToken = [];
  before(function (done) {
    data = dataService.getData();
    var users = [data[0].users[0], data[2].users[0]];
    var companies = [data[0].model, data[2].model];
    
    async.parallel([
      function(callback) {
        var i =0 ;
        async.whilst(
          function() {
            return i < 2;
          },
          function(cb) {
            request.post('/users/login')
              .send({
                email: users[i].email,
                password: '55yali'
              })
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  console.log(res.body);
                  cb(err);
                }
                userToken[i] = res.body.token;
                i++;
                cb();
              });
          },
          function(err) {
            if(err) callback(err);
            else callback();
          }
        )
      },
      function(callback) {
        var j = 0;
        async.whilst(
          function() {
            return j < 2;
          },
          function(cb) {
            request.post('/companies/login')
              .send({
                username: companies[j].username,
                password: '55yali'
              })
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  console.log(res.body);
                  cb(err);
                }
                hrToken[j] = res.body.token;
                j++;
                cb();
              });
          },
          function(err) {
            if(err) callback(err);
            else callback();
          }
        )
      }
    ],function(err, results) {
      if(err)
        return done(err);
      done();
    })
  })
  
  describe('get /comments', function() {
    describe('本公司成员', function() {
      var getCommentsSuccessTest = function(theme, index) {
        var title = util.format('本公司成员可以获取%s的评论', theme);
        it(title, function(done) {
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
          request.get('/comments')
          .set('x-access-token', userToken[0])
          .query({requestType:'campaign', requestId:hostId.toString(), limit:20})
          .expect(202)
          .end(function (err,res) {
            if(err) return done(err);
            res.body.comments.length.should.be.above(-1);
            done();
          })
        })
      };
      getCommentsSuccessTest('本公司本队活动', 1);
      getCommentsSuccessTest('本公司活动', 2);
      getCommentsSuccessTest('本公司内挑战', 3);
      getCommentsSuccessTest('本公司参与公司外挑战', 4);
    })
    describe('本公司HR', function() {
      var getCommentsSuccessTest = function(theme, index) {
        var title = util.format('本公司HR可以获取%s的评论',theme);
        it(title, function(done) {
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
          request.get('/comments')
          .set('x-access-token', hrToken[0])
          .query({requestType:'campaign', requestId:hostId.toString(), limit:20})
          .expect(202)
          .end(function (err,res) {
            if(err) return done(err);
            res.body.comments.length.should.be.above(-1);
            done();
          })
        })
      };
      getCommentsSuccessTest('本公司小队活动', 1);
      getCommentsSuccessTest('本公司的公司活动', 2);
      getCommentsSuccessTest('本公司内挑战', 3);
      getCommentsSuccessTest('本公司参与公司外挑战', 4);
    })
    describe('外公司成员', function() {
      var getCommentsFailTest = function(theme, index) {
        var title = util.format('公司成员不能获取%s的评论',theme);
        it(title, function(done) {
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
          request.get('/comments')
          .set('x-access-token', userToken[1])
          .query({requestType:'campaign', requestId:hostId.toString(), limit:20})
          .expect(403)
          .end(function (err,res) {
            if(err) return done(err);
            done();
          })
        })
      };
      getCommentsFailTest('外公司小队活动', 1);
      getCommentsFailTest('外公司公司活动', 2);
      getCommentsFailTest('外公司内挑战', 3);
      getCommentsFailTest('本公司不参与的公司外挑战', 4);
    })
    describe('外公司HR', function() {
      var getCommentsFailTest = function(theme, index) {
        var title = util.format('公司HR不能获取%s的评论',theme);
        it(title, function(done) {
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
          request.get('/comments')
          .set('x-access-token', hrToken[1])
          .query({requestType:'campaign', requestId:hostId.toString(), limit:20})
          .expect(403)
          .end(function (err,res) {
            if(err) return done(err);
            done();
          })
        })
      };
      getCommentsFailTest('外公司小队活动', 1);
      getCommentsFailTest('外公司公司活动', 2);
      getCommentsFailTest('外公司内挑战', 3);
      getCommentsFailTest('本公司不参与的公司外挑战', 4);
    })
  })
};