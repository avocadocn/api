var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('get /campaigns', function () {

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
    //仅包含active的活动
    getCampaignTest('应该成功获取公司所有活动',{requestType:'company'},13);
    getCampaignTest('应该成功获取小队所有活动',{requestType:'team'},9);
    getCampaignTest('应该成功获取个人所有活动',{requestType:'user'},13);
    getCampaignTest('应该成功获取个人已参加活动',{requestType:'user',join_flag:'1'},9);
    getCampaignTest('应该成功获取个人未参加活动',{requestType:'user',join_flag:'0'},3);
    getCampaignTest('应该成功获取个人即将开始活动',{requestType:'user',select_type:'1'},2);
    getCampaignTest('应该成功获取个人正在进行活动',{requestType:'user',select_type:'2'},2);
    getCampaignTest('应该成功获取个人可参加活动',{requestType:'user',select_type:'3'},2);
    getCampaignTest('应该成功获取个人未确认挑战',{requestType:'user',select_type:'4'},3);
    getCampaignTest('应该成功获取个人分类全部活动',{requestType:'user',select_type:'0'},4,[2,2,3,4]);//四种类型活动
    // getCampaignTest('活动类型',{campaign_type: 's'});
    // getCampaignTest('小队tid',{tid: []});
    // getCampaignTest('主题',{theme:chance.string({length: 20})});
    // getCampaignTest('活动模型',{campaign_mold:'ss'},500);
    // getCampaignTest('开始时间',{start_time:chance.date({year: nowYear, month: nowMonth -1})});
    // getCampaignTest('结束时间',{end_time:chance.date({year: nowYear, month: nowMonth -1})});

  });
};




