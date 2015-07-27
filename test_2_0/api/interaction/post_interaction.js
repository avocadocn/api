var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
module.exports = function () {
  describe('post /interaction', function () {

    describe('用户发活动', function () {
      var accessToken;
      var now = new Date();
      var nowYear = now.getFullYear();
      var nowMonth = now.getMonth();
      var data;
      before(function (done) {
        data = dataService.getData();
        var user = data[0].teams[1].leaders[0];
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
      it('应该成功发活动', function (done) {
        var campaignData = {
          cid: data[0].model.id,
          type: 1,
          targetType: 3,
          target:data[0].model.id,
          theme:chance.string({length: 10}),
          location:{
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          },
          activityMold:chance.string({length: 5}),
          content:chance.paragraph(),
          tags: [chance.string({length: 5}),chance.string({length: 5})],
          startTime:chance.date({year: nowYear, month: nowMonth +1}),
          endTime:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/interaction')
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('activity');
            done();
          });
      });
      it('应该成功发投票', function (done) {
        var pollData = {
          cid: data[0].model.id,
          type: 2,
          targetType: 3,
          target:data[0].model.id,
          theme:chance.string({length: 10}),
          content:chance.paragraph(),
          option:[chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5})],
          tags: [chance.string({length: 5}),chance.string({length: 5})],
          startTime:chance.date({year: nowYear, month: nowMonth +1}),
          endTime:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(pollData)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('poll');
            done();
          });
      });
      it('应该成功发求助', function (done) {
        var questionData = {
          cid: data[0].model.id,
          type: 3,
          targetType: 3,
          target:data[0].model.id,
          theme:chance.string({length: 10}),
          content:chance.paragraph(),
          tags: [chance.string({length: 5}),chance.string({length: 5})],
          startTime:chance.date({year: nowYear, month: nowMonth +1}),
          endTime:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(questionData)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('question');
            done();
          });
      });
      // it('个人发公司活动时活动应该返回403', function (done) {
      //   var campaignData = {
      //     cid: [data[0].model.id],
      //     campaign_type: 1,
      //     theme:chance.string({length: 10}),
      //     location:{
      //       name : chance.address(),
      //       coordinates : [chance.longitude(), chance.latitude()]
      //     },
      //     campaign_mold: data[0].teams[1].model.group_type,
      //     start_time:chance.date({year: nowYear, month: nowMonth +1}),
      //     end_time:chance.date({year: nowYear, month: nowMonth +2})
      //   }
      //   request.post('/campaigns')
      //     .send(campaignData)
      //     .set('x-access-token', accessToken)
      //     .expect(403)
      //     .end(function (err, res) {
      //       if (err) return done(err);
      //       res.body.msg.should.have.equal("您没有权限发布该活动");
      //       done();
      //     });
      // });
      // var errorCampaignTest = function (theme, campaignData, expectStatus) {
      //   var _expectStatus = expectStatus !=undefined ? expectStatus : 400;
      //   var msg = util.format('应该在数据%s错误时返回%s', theme, _expectStatus);
      //   it(msg, function (done) {
      //     var _campaignData = {
      //       cid: campaignData.cid!=undefined ? campaignData.cid : [data[0].model.id],
      //       tid: campaignData.tid!=undefined ? campaignData.tid : [data[0].teams[1].model.id],
      //       campaign_type: campaignData.campaign_type!=undefined ?campaignData.campaign_type: 2,
      //       theme: campaignData.theme!=undefined ? campaignData.theme : chance.string({length: 10}),
      //       location:campaignData.location!=undefined ? campaignData.location : {
      //         name : chance.address(),
      //         coordinates : [chance.longitude(), chance.latitude()]
      //       },
      //       campaign_mold: campaignData.campaign_mold !=undefined? campaignData.campaign_mold : data[0].teams[1].model.group_type,
      //       start_time: campaignData.start_time!=undefined ?campaignData.start_time : chance.date({year: nowYear, month: nowMonth +1}),
      //       end_time: campaignData.end_time!=undefined ?campaignData.end_time : chance.date({year: nowYear, month: nowMonth +2})
      //     }

      //     request.post('/campaigns')
      //       .send(_campaignData)
      //       .set('x-access-token', accessToken)
      //       .expect(_expectStatus)
      //       .end(function (err, res) {
      //         if (err) return done(err);
      //         res.body.msg.should.be.type('string');
      //         done();
      //       });
      //   });
      // };

      // errorCampaignTest('公司id',{cid:[]});
      // errorCampaignTest('活动类型',{campaign_type: 's'});
      // errorCampaignTest('小队tid',{tid: []});
      // errorCampaignTest('主题',{theme:chance.string({length: 20})});
      // errorCampaignTest('活动模型',{campaign_mold:'ss'},500);
      // errorCampaignTest('开始时间',{start_time:chance.date({year: nowYear, month: nowMonth -1})});
      // errorCampaignTest('结束时间',{end_time:chance.date({year: nowYear, month: nowMonth -1})});
    })
  })
}