'use strict';

var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function() {
  describe('get /teams', function() {

    describe('用户获取小队列表', function () {
      var accessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var user = data[0].users[0];
        request.post('/users/login')
          .send({
            email: user.email,
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

      var getTeamsTest = function (msg, queryData, expectLength, option) {
        option = option || {};
        it(msg, function (done) {
          switch(queryData.hostType) {
            case 'company':
              queryData.hostId = data[0].model.id;
              break;
            case 'user':
              var index = option.otherUser ? option.otherUser :0;
              queryData.hostId = data[0].users[index].id;
              break;
            default:
              break;;
          }
          request.get('/teams')
            .set('x-access-token', accessToken)
            .query(queryData)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.should.be.instanceof(Array).and.have.lengthOf(expectLength);
              done();
            });
        });
      };
      getTeamsTest('应该成功获取公司所有小队',{hostType:'company'},6);
      getTeamsTest('应该成功获取个人所有小队',{hostType:'user'},2);
      getTeamsTest('应该成功获取同事所有小队',{hostType:'user'},1,{otherUser:1});
      getTeamsTest('应该成功获取个人为队长的所有小队',{hostType:'user',leadFlag:'true'},1);
      getTeamsTest('应该成功获取个人某类型的所有小队',{hostType:'user',gid:3},1);
      getTeamsTest('应该成功获取个人的官方小队',{hostType:'user',personalFlag:'false'},2);
      getTeamsTest('应该成功获取个人的个人创建小队',{hostType:'user',personalFlag:'true'},0);
      it('hostType不正确应该返回400', function (done) {
        request.get('/teams')
          .set('x-access-token', accessToken)
          .query({hostType:'ss'})
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('hostType只能是company,user');
            done();
          });
      });
    });
    describe('hr获取小队列表', function () {
      var hrAccessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var hr = data[0].model;
        request.post('/companies/login')
          .send({
            username: hr.username,
            password: '55yali'
          })
          .end(function (err, res) {
            if (err) return done(err);
            if (res.statusCode === 200) {
              hrAccessToken = res.body.token;
            }
            done();
          });
      });
      var getTeamsTest = function (msg, queryData, expectLength, option) {
        option = option || {};
        it(msg, function (done) {
          switch(queryData.hostType) {
            case 'company':
              queryData.hostId = data[0].model.id;
              break;
            case 'user':
              var index = option.otherUser ? option.otherUser :0;
              queryData.hostId = data[0].users[index].id;
              break;
            default:
              break;;
          }
          request.get('/teams')
            .set('x-access-token', hrAccessToken)
            .query(queryData)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.should.be.instanceof(Array).and.have.lengthOf(expectLength);
              done();
            });
        });
      };
      getTeamsTest('应该成功获取公司所有小队',{hostType:'company'},6);
      getTeamsTest('应该成功获取个人所有小队',{hostType:'user'},2);
      getTeamsTest('应该成功获取同事所有小队',{hostType:'user'},1,{otherUser:1});
      getTeamsTest('应该成功获取个人为队长的所有小队',{hostType:'user',leadFlag:'true'},1);
      getTeamsTest('应该成功获取个人某类型的所有小队',{hostType:'user',gid:3},1);
      getTeamsTest('应该成功获取个人的官方小队',{hostType:'user',personalFlag:'false'},2);
      getTeamsTest('应该成功获取个人的个人创建小队',{hostType:'user',personalFlag:'true'},0);
    });
  });
};



