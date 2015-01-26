var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /campaigns', function () {
    describe('用户获取活动', function () {
      var accessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var user = data[5].users[0];
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
      var getCampaignTest = function (msg, queryData, expectLength) {
        it(msg, function (done) {
          switch(queryData.requestType) {
            case 'company':
              queryData.requestId = data[5].model.id;
              break;
            case 'team':
              queryData.requestId = data[5].teams[0].model.id;
              break;
            case 'user':
              queryData.requestId = data[5].users[0].id;
              break;
            default:
              break;;
          }
          request.get('/campaigns')
            .set('x-access-token', accessToken)
            .query(queryData)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.should.be.instanceof(Array).and.have.lengthOf(expectLength);
              if(queryData=='0'){
                res.body[0].should.be.instanceof(Array).and.have.lengthOf(expectLength);
                res.body[1].should.be.instanceof(Array).and.have.lengthOf(expectLength);
                res.body[2].should.be.instanceof(Array).and.have.lengthOf(expectLength);
                res.body[3].should.be.instanceof(Array).and.have.lengthOf(expectLength);
              }
              done();
            });
        });
      };
      var now = new Date();
      var start = new Date();
      start.setDate(1);
      var end = new Date();
      end.setMonth(now.getMonth()+1);
      end.setDate(1);
      //仅包含active的活动
      getCampaignTest('应该成功获取公司所有活动',{requestType:'company'},13);
      getCampaignTest('应该成功获取小队所有活动',{requestType:'team'},9);
      getCampaignTest('应该成功获取个人所有活动',{requestType:'user'},13);
      getCampaignTest('应该成功获取个人所有活动(前10条)',{requestType:'user',limit:10},10);
      getCampaignTest('应该成功获取个人本月所有活动',{requestType:'user',from:start.getTime(),to:end.getTime()},4);
      getCampaignTest('应该成功获取个人已参加活动',{requestType:'user',join_flag:'1'},9);
      getCampaignTest('应该成功获取个人未参加活动',{requestType:'user',join_flag:'0'},4);
      getCampaignTest('应该成功获取个人即将开始活动',{requestType:'user',select_type:'1'},3);
      getCampaignTest('应该成功获取个人正在进行活动',{requestType:'user',select_type:'2'},3);
      getCampaignTest('应该成功获取个人已经结束活动',{requestType:'user',select_type:'3'},3);
      getCampaignTest('应该成功获取个人可参加活动',{requestType:'user',select_type:'4'},3);
      getCampaignTest('应该成功获取个人未确认挑战',{requestType:'user',select_type:'5'},3);
      getCampaignTest('应该成功获取个人分类全部活动',{requestType:'user',select_type:'0'},4,[3,3,3,3]);//四种类型活动
      it('获取不正确的主体id的活动应该返回400', function (done) {
        request.get('/campaigns')
          .set('x-access-token', accessToken)
          .query({requestType:'company',requestId:'222'})
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('参数不正确');
            done();
          });
      });
      it('获取其他公司活动应该返回404', function (done) {
        request.get('/campaigns')
          .set('x-access-token', accessToken)
          .query({requestType:'company',requestId:data[5].users[0].id})
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('未找到该活动');
            done();
          });
      });
      it('获取其他公司活动应该返回403', function (done) {
        request.get('/campaigns')
          .set('x-access-token', accessToken)
          .query({requestType:'company',requestId:data[1].model.id})
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限获取该活动');
            done();
          });
      });
      it('获取其他小队的活动应该成功', function (done) {
        request.get('/campaigns')
          .set('x-access-token', accessToken)
          .query({requestType:'team',requestId:data[5].teams[2].model.id})
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.be.instanceof(Array);
            done();
          });
      });
      it('获取其他人的活动应该成功', function (done) {
        request.get('/campaigns')
          .set('x-access-token', accessToken)
          .query({requestType:'user',requestId:data[5].users[1].id})
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.be.instanceof(Array);
            done();
          });
      });
    });
    describe('hr获取活动', function () {
      var hrAccessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
        var hr = data[5].model;
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
      var getCampaignTest = function (msg, queryData, expectLength) {
        it(msg, function (done) {
          switch(queryData.requestType) {
            case 'company':
              queryData.requestId = data[5].model.id;
              break;
            case 'team':
              queryData.requestId = data[5].teams[0].model.id;
              break;
            case 'user':
              queryData.requestId = data[5].users[0].id;
              break;
            default:
              break;;
          }
          request.get('/campaigns')
            .set('x-access-token', hrAccessToken)
            .query(queryData)
            .expect(200)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.should.be.instanceof(Array).and.have.lengthOf(expectLength);
              if(queryData=='0'){
                res.body[0].should.be.instanceof(Array).and.have.lengthOf(expectLength);
                res.body[1].should.be.instanceof(Array).and.have.lengthOf(expectLength);
                res.body[2].should.be.instanceof(Array).and.have.lengthOf(expectLength);
                res.body[3].should.be.instanceof(Array).and.have.lengthOf(expectLength);
              }
              done();
            });
        });
      };
      var now = new Date();
      var start = new Date();
      start.setDate(1);
      var end = new Date();
      end.setMonth(now.getMonth()+1);
      end.setDate(1);
      //仅包含active的活动
      getCampaignTest('应该成功获取公司所有活动',{requestType:'company'},13);
      getCampaignTest('应该成功获取小队所有活动',{requestType:'team'},9);
      getCampaignTest('应该成功获取个人所有活动',{requestType:'user'},13);
      getCampaignTest('应该成功获取个人所有活动(前10条)',{requestType:'user',limit:10},10);
      getCampaignTest('应该成功获取个人本月所有活动',{requestType:'user',from:start.getTime(),to:end.getTime()},4);
      getCampaignTest('应该成功获取个人已参加活动',{requestType:'user',join_flag:'1'},9);
      getCampaignTest('应该成功获取个人未参加活动',{requestType:'user',join_flag:'0'},4);
      getCampaignTest('应该成功获取个人即将开始活动',{requestType:'user',select_type:'1'},3);
      getCampaignTest('应该成功获取个人正在进行活动',{requestType:'user',select_type:'2'},3);
      getCampaignTest('应该成功获取个人已经结束活动',{requestType:'user',select_type:'3'},3);
      getCampaignTest('应该成功获取个人可参加活动',{requestType:'user',select_type:'4'},3);
      getCampaignTest('应该成功获取个人未确认挑战',{requestType:'user',select_type:'5'},3);
      getCampaignTest('应该成功获取个人分类全部活动',{requestType:'user',select_type:'0'},4,[3,3,3,3]);//四种类型活动
      it('获取其他公司的活动应该返回403', function (done) {
        request.get('/campaigns')
          .set('x-access-token', hrAccessToken)
          .query({requestType:'company',requestId:data[1].model.id})
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限获取该活动');
            done();
          });
      });
    });
  });
};




