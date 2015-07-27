var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var util = require('util');
var async = require('async');
//本公司可以，其它公司的不可

module.exports = function() {
  var data, 
    tokens = [];//第1、2为user 3、4为hr

  before(function (done) {
    data = dataService.getData();
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
                email: data[i].users[0].email,
                password: '55yali'
              })
              .expect(200)
              .end(function (err, res) {
                if (err) {
                  console.log(res.body);
                  cb(err);
                }
                tokens[i*2] = res.body.token;
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
        async.parallel([
            function(callback) {
              request.post('/companies/login')
                .send({
                  username: data[0].model.username,
                  password: '55yali'
                })
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    // console.log(res.body);
                    callback(err);
                  }
                  tokens[1] = res.body.token;
                  callback();
                });
            },
            function(callback) {
              request.post('/companies/login')
                .send({
                  username: data[1].model.username,
                  password: '55yali'
                })
                .expect(200)
                .end(function (err, res) {
                  if (err) {
                    // console.log(res.body);
                    callback(err);
                  }
                  tokens[3] = res.body.token;
                  callback();
                });
            }
          ],
          // optional callback
          function(err, results) {
            callback(err, results);
          });
        // var j = 0;
        // async.whilst(
        //   function() {
        //     return j < 2;
        //   },
        //   function(cb) {
        //     request.post('/companies/login')
        //       .send({
        //         username: data[j].model.username,
        //         password: '55yali'
        //       })
        //       .expect(200)
        //       .end(function (err, res) {
        //         if (err) {
        //           console.log(res.body);
        //           cb(err);
        //         }
        //         tokens[j*2+1] = res.body.token;
        //         j++;
        //         cb();
        //       });
        //   },
        //   function(err) {
        //     if(err) callback(err);
        //     else callback();
        //   }
        // )
      }
    ],function(err, results) {
      if(err)
        return done(err);
      done();
    })
  })

  describe('get /teams/:teamId/family_photos', function() {
    var getFamilyPhotosTest = function(theme, index) {
      var title = util.format('%s可在相册取得全家福', theme);
      it(title, function (done) {
        var teamId = data[0].teams[0].model._id;
        var respondCode = index<2 ? 200 : 403 ;
        request.get('/teams/' + teamId + '/family_photos')
          .set('x-access-token', tokens[index])
          .expect(respondCode)
          .end(function(err, res) {
            if(err) return done(err);
            done();
          })
      })
    }
    getFamilyPhotosTest('公司成员', 0);
    getFamilyPhotosTest('公司HR', 1);
    getFamilyPhotosTest('非本公司成员不', 2);
    getFamilyPhotosTest('非本公司HR不', 3);
  })
};