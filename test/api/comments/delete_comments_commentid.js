var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var dataService = require('../../create_data');
var tools = require('../../../tools/tools.js');
var async = require('async');
var chance = require('chance').Chance();

module.exports = function () {
  var data, 
  userToken = [], 
  hrToken = [], 
  comments = [];

  before(function (done) {
    //登录一个非队长，发五条评论，应该自己能删除、队长能删除、hr能删除，别人不能删除,别的hr不能删除
    //第一个公司的第二个人
    data = dataService.getData();
    var i = 0;
    async.series({
      //登录
      login: function(callback) {
        async.parallel({
          members: function (cb) {
            var i = 0;
            async.whilst(
              function() {return i < 3;},
              function (cbc) {
                request.post('/users/login')
                  .send({
                    email: data[0].users[i].email,
                    password: '55yali'
                  })
                  .expect(200)
                  .end(function (r_err, res) {
                    if (r_err) {
                      console.log(res.body);
                      cbc(r_err);
                    }else{
                      userToken[i] = res.body.token;
                      i++;
                      cbc();
                    }
                  });
              },
              //whilst error
              function(w_err) {
                if(w_err) cb(w_err);
                else cb();
              }
            );
          },
          hr : function (cb) {
            var j = 0;
            async.whilst(
              function() {return j < 2;},
              function (cbc) {
                request.post('/companies/login')
                  .send({
                    username: data[j].model.username,
                    password: '55yali'
                  })
                  .expect(200)
                  .end(function (r_err, res) {
                    if (r_err) {
                      console.log(res.body);
                      cbc(r_err);
                    }else{
                      hrToken[j] = res.body.token;
                      j++;
                      cbc();
                    }
                  });
              },
              //whilst error
              function(w_err) {
                if(w_err) cb(w_err);
                else cb();
              }
            );
          }
        },
        //parallel error
        function (p_err, results) {
          if(p_err) callback(p_err);
          else callback();
        });
      },
      //发评论
      comment: function(callback) {
        var j = 0;
        var hostId = data[0].teams[0].campaigns[0]._id;
        async.whilst(
          function () {return j<5;},
          function (cb) {
            request.post('/comments/host_type/campaign/host_id/' + hostId)
              .set('x-access-token', userToken[1])
              .send({content:chance.string()})
              .expect(200)
              .end(function (r_err,res) {
                if(r_err) return cb(r_err);
                else {
                  comments[j] = res.body.comment;
                  j++;
                  cb();
                }
              })
          },
          //whilst error
          function(w_err) {
            if(w_err) callback(w_err);
            else callback();
          }
        )
      }
    },
    //serries error
    function (s_err, results) {
      if(s_err) return done(s_err);
      else done();
    })
  })
  describe('delete /comments/:commentId', function() {
    var deleteCommentSuccessTest =  function(theme, index) {
      var title = util.format('某人发的评论应该%s能删除成功', theme);
      it(title, function(done) {
        var token;
        switch (index) {
          case 0:
            token = userToken[1];
            break;
          case 1:
            token = userToken[0];
            break;
          case 2:
            token = hrToken[0];
            break;
        }
        request.delete('/comments/'+comments[index]._id)
          .set('x-access-token', token)
          .expect(200)
          .end(function (err, res) {
            if(err) return done(err);
            done();
          });
      });
    };
    deleteCommentSuccessTest('自己', 0);
    deleteCommentSuccessTest('队长', 1);
    deleteCommentSuccessTest('本公司hr', 2);

    var deleteCommentFailTest =  function(theme, index) {
      var title = util.format('某人发的评论应该%s', theme);
      it(title, function(done) {
        var token;
        switch (index) {
          case 3:
            token = userToken[2];
            break;
          case 4:
            token = hrToken[1];
            break;
        }
        request.delete('/comments/'+comments[index]._id)
          .set('x-access-token', token)
          .expect(403)
          .end(function (err, res) {
            if(err) return done(err);
            done();
          });
      });
    };
    deleteCommentFailTest('非队长公司成员不能删除',3);
    deleteCommentFailTest('非本公司hr不能删除',4);
  })

};