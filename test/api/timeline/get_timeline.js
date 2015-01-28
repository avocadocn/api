// Copyright by ytoon, 2015/01/23
// Test the get timeline routes.
// Warning: The following function depends on the relations among users, 
// companies and campaingns. If the relations changes, the funtions maybe
// get errors.
'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

/**
 * Test the get timeline routes.
 * @return null
 */
module.exports = function() {
  describe('get /timeline/', function() {

    var accessToken = [,];
    var accessCompanyToken;
    var year, month;// campaign time
    before(function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      var user = data[0].users[0];

      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessToken[0] = res.body.token;
          //done();
        });

      var user = data[0].users[1];
      request.post('/users/login')
        .send({
          email: user.email,
          password: '55yali'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessToken[1] = res.body.token;
          //done();
        });

      request.post('/companies/login')
        .send({
          username: company.username,
          password: '55yali'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            console.log(res.body);
            return done(err);
          }
          accessCompanyToken = res.body.token;
          done();
        });

    });
    // Routes: get /timeline/record/{requestType}/{requestId} 
    //  and get /timeline/data/{requestType}/{requestId} 
    it('用户获取活动时间', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      
      request.get('/timeline/record/user/' + user._id.toString())
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });

      
    });

    it('用户根据活动时间获取活动内容', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.get('/timeline/data/user/' + user._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });
    
    it('用户获取所在公司活动时间', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/record/company/' + company._id.toString())
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });
    });

    it('用户根据活动时间获取所在公司活动内容', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/data/company/' + company._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('用户获取所在小队活动时间', function(done) {
      var data = dataService.getData();
      var team = data[0].users[0].team[0];
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });
    });

    it('用户根据活动时间获取所在小队活动内容', function(done) {
      var data = dataService.getData();
      var team = data[0].users[0].team[0];
      request.get('/timeline/data/team/' + team._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('用户获取所在公司其他小队活动时间', function(done) {
      var data = dataService.getData();
      var team = data[0].users[2].team[0];
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessToken[1])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });
    });

    it('用户根据活动时间获取所在公司其他小队活动内容', function(done) {
      var data = dataService.getData();
      var team = data[0].users[2].team[0];
      request.get('/timeline/data/team/' + team._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessToken[1])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('用户无法获取其他公司用户活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var user = data[1].users[0];
      request.get('/timeline/record/user/' + user._id.toString())
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('用户无法获取其他公司活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var company = data[1].model;
      request.get('/timeline/record/company/' + company._id.toString())
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('用户无法获取其他公司小队活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var team = data[1].users[0].team[0];
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('HR获取其员工活动时间', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.get('/timeline/record/user/' + user._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });
    });

    it('HR根据活动时间获取其员工活动内容', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.get('/timeline/data/user/' + user._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR获取其小队活动时间', function(done) {
      var data = dataService.getData();
      var team = data[0].teams[0].model;
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });
    });

    it('HR根据活动时间获取其小队活动内容', function(done) {
      var data = dataService.getData();
      var team = data[0].teams[0].model;
      request.get('/timeline/data/team/' + team._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR获取其公司活动时间', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/record/company/' + company._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          year = res.body[0].year;
          month = res.body[0].month[0].month;
          done();
        });
    });

    it('HR根据活动时间获取其公司活动内容', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/data/company/' + company._id.toString() + '?year=' + year + '&month=' + month)
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR无法获取其他公司员工活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var user = data[1].users[1];
      request.get('/timeline/record/user/' + user._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('HR无法获取其小队活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var team = data[1].teams[0].model;
      request.get('/timeline/record/team/' + team._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('HR无法获取其他公司活动时间，权限不够', function(done) {
      var data = dataService.getData();
      var company = data[1].model;
      request.get('/timeline/record/company/' + company._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });
    // Route: get /timeline/{requestType}/{requestId} 
    // 
    it('用户获取2页活动', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      
      request.get('/timeline/user/' + user._id.toString() + '?page=2')
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          
          done();
        });
    });

    it('用户获取所在公司2页活动', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/company/' + company._id.toString() + '?page=2')
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('用户获取所在小队2页活动', function(done) {
      var data = dataService.getData();
      var team = data[0].users[0].team[0];
      request.get('/timeline/team/' + team._id.toString() + '?page=2')
        .set('x-access-token', accessToken[0])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('用户获取所在公司其他小队2页活动', function(done) {
      var data = dataService.getData();
      var team = data[0].users[2].team[0];
      request.get('/timeline/team/' + team._id.toString() + '?page=2')
        .set('x-access-token', accessToken[1])
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('用户无法获取其他公司用户2页活动，权限不够', function(done) {
      var data = dataService.getData();
      var user = data[1].users[0];
      request.get('/timeline/user/' + user._id.toString() + '?page=2')
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('用户无法获取其他公司2页活动，权限不够', function(done) {
      var data = dataService.getData();
      var company = data[1].model;
      request.get('/timeline/company/' + company._id.toString() + '?page=2')
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('用户无法获取其他公司小队2页活动，权限不够', function(done) {
      var data = dataService.getData();
      var team = data[1].users[0].team[0];
      request.get('/timeline/team/' + team._id.toString() + '?page=2')
        .set('x-access-token', accessToken[0])
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('HR获取其员工2页活动', function(done) {
      var data = dataService.getData();
      var user = data[0].users[0];
      request.get('/timeline/user/' + user._id.toString() + '?page=2')
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR获取其小队2页活动', function(done) {
      var data = dataService.getData();
      var team = data[0].teams[0].model;
      request.get('/timeline/team/' + team._id.toString() + '?page=2')
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR获取其公司2页活动', function(done) {
      var data = dataService.getData();
      var company = data[0].model;
      request.get('/timeline/company/' + company._id.toString() + '?page=2')
        .set('x-access-token', accessCompanyToken)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('HR无法获取其他公司员工2页活动，权限不够', function(done) {
      var data = dataService.getData();
      var user = data[1].users[1];
      request.get('/timeline/user/' + user._id.toString() + '?page=2')
        .set('x-access-token', accessCompanyToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('HR无法获取其他公司小队活动，权限不够', function(done) {
      var data = dataService.getData();
      var team = data[1].teams[0].model;
      request.get('/timeline/team/' + team._id.toString() + '?page=2')
        .set('x-access-token', accessCompanyToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });

    it('HR无法获取其他公司2页活动，权限不够', function(done) {
      var data = dataService.getData();
      var company = data[1].model;
      request.get('/timeline/company/' + company._id.toString())
        .set('x-access-token', accessCompanyToken)
        .expect(403)
        .end(function(err, res) {
          if (err) return done(err);

          done();
        });
    });
  });
};