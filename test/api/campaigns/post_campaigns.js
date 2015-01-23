var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
var common = require('../../support/common');
var mongoose = common.mongoose;
var Campaign = mongoose.model('Campaign');
module.exports = function () {
  describe('post /campaigns', function () {

    describe('用户发活动', function () {
      var accessToken;
      var now = new Date();
      var nowYear = now.getFullYear();
      var nowMonth = now.getMonth();
      before(function (done) {
        var data = dataService.getData();
        var user = data[0].teams[0].leaders[0];
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
        var data = dataService.getData();
        var campaignData = {
          cid: [data[0].model.id],
          tid: [data[0].teams[0].model.id],
          campaign_type: 2,
          theme:chance.string({length: 10}),
          location:{
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          },
          campaign_mold: data[0].teams[0].model.group_type,
          start_time:chance.date({year: nowYear, month: nowMonth +1}),
          end_time:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('campaign_id','photo_album_id');
            done();
          });
      });
      it('个人发公司活动时活动应该返回403', function (done) {
        var data = dataService.getData();
        var campaignData = {
          cid: [data[0].model.id],
          campaign_type: 1,
          theme:chance.string({length: 10}),
          location:{
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          },
          campaign_mold: data[0].teams[0].model.group_type,
          start_time:chance.date({year: nowYear, month: nowMonth +1}),
          end_time:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.have.equal("您没有权限发布该活动");
            done();
          });
      });
      var errorCampaignTest = function (theme, campaignData, expectStatus) {
        var _expectStatus = expectStatus !=undefined ? expectStatus : 400;
        var msg = util.format('应该在数据%s错误时返回%s', theme, _expectStatus);
        it(msg, function (done) {
          var data = dataService.getData();
          var _campaignData = {
            cid: campaignData.cid!=undefined ? campaignData.cid : [data[0].model.id],
            tid: campaignData.tid!=undefined ? campaignData.tid : [data[0].teams[0].model.id],
            campaign_type: campaignData.campaign_type!=undefined ?campaignData.campaign_type: 2,
            theme: campaignData.theme!=undefined ? campaignData.theme : chance.string({length: 10}),
            location:campaignData.location!=undefined ? campaignData.location : {
              name : chance.address(),
              coordinates : [chance.longitude(), chance.latitude()]
            },
            campaign_mold: campaignData.campaign_mold !=undefined? campaignData.campaign_mold : data[0].teams[0].model.group_type,
            start_time: campaignData.start_time!=undefined ?campaignData.start_time : chance.date({year: nowYear, month: nowMonth +1}),
            end_time: campaignData.end_time!=undefined ?campaignData.end_time : chance.date({year: nowYear, month: nowMonth +2})
          }

          request.post('/campaigns')
            .send(_campaignData)
            .set('x-access-token', accessToken)
            .expect(_expectStatus)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.be.type('string');
              done();
            });
        });
      };

      errorCampaignTest('公司id',{cid:[]});
      errorCampaignTest('活动类型',{campaign_type: 's'});
      errorCampaignTest('小队tid',{tid: []});
      errorCampaignTest('主题',{theme:chance.string({length: 20})});
      errorCampaignTest('活动模型',{campaign_mold:'ss'},500);
      errorCampaignTest('开始时间',{start_time:chance.date({year: nowYear, month: nowMonth -1})});
      errorCampaignTest('结束时间',{end_time:chance.date({year: nowYear, month: nowMonth -1})});
    });
    describe('hr发活动', function () {
      var now = new Date();
      var nowYear = now.getFullYear();
      var nowMonth = now.getMonth();
      var hrAccessToken;

      before(function (done) {
        var data = dataService.getData();
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
      it('应该成功发公司活动', function (done) {
        var data = dataService.getData();
        var campaignData = {
          cid: [data[0].model.id],
          campaign_type: 1,
          theme:chance.string({length: 10}),
          location:{
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          },
          campaign_mold: '其它',
          start_time:chance.date({year: nowYear, month: nowMonth +1}),
          end_time:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('campaign_id','photo_album_id');
            done();
          });
      });
      it('应该成功发小队活动', function (done) {
        var data = dataService.getData();
        var campaignData = {
          cid: [data[0].model.id],
          tid: [data[0].teams[0].model.id],
          campaign_type: 2,
          theme:chance.string({length: 10}),
          location:{
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          },
          campaign_mold: data[0].teams[0].model.group_type,
          start_time:chance.date({year: nowYear, month: nowMonth +1}),
          end_time:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('campaign_id','photo_album_id');
            done();
          });
      });
      it('hr发其他公司活动时活动应该返回403', function (done) {
        var data = dataService.getData();
        var campaignData = {
          cid: [data[1].model.id],
          campaign_type: 1,
          theme:chance.string({length: 10}),
          location:{
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          },
          campaign_mold: data[0].teams[0].model.group_type,
          start_time:chance.date({year: nowYear, month: nowMonth +1}),
          end_time:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/campaigns')
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.have.equal("您没有权限发布该活动");
            done();
          });
      });
      var errorCampaignTest = function (theme, campaignData, expectStatus) {
        var _expectStatus = expectStatus !=undefined ? expectStatus : 400;
        var msg = util.format('应该在数据%s错误时返回%s', theme, _expectStatus);
        it(msg, function (done) {
          var data = dataService.getData();
          var _campaignData = {
            cid: campaignData.cid!=undefined ? campaignData.cid : [data[0].model.id],
            tid: campaignData.tid!=undefined ? campaignData.tid : [data[0].teams[0].model.id],
            campaign_type: campaignData.campaign_type!=undefined ?campaignData.campaign_type: 2,
            theme: campaignData.theme!=undefined ? campaignData.theme : chance.string({length: 10}),
            location:campaignData.location!=undefined ? campaignData.location : {
              name : chance.address(),
              coordinates : [chance.longitude(), chance.latitude()]
            },
            campaign_mold: campaignData.campaign_mold !=undefined? campaignData.campaign_mold : data[0].teams[0].model.group_type,
            start_time: campaignData.start_time!=undefined ?campaignData.start_time : chance.date({year: nowYear, month: nowMonth +1}),
            end_time: campaignData.end_time!=undefined ?campaignData.end_time : chance.date({year: nowYear, month: nowMonth +2})
          }

          request.post('/campaigns')
            .send(_campaignData)
            .set('x-access-token', hrAccessToken)
            .expect(_expectStatus)
            .end(function (err, res) {
              if (err) return done(err);
              res.body.msg.should.be.type('string');
              done();
            });
        });
      };

      errorCampaignTest('公司id',{cid:[]});
      errorCampaignTest('活动类型',{campaign_type: 's'});
      errorCampaignTest('小队tid',{tid: []});
      errorCampaignTest('主题',{theme:chance.string({length: 20})});
      errorCampaignTest('活动模型',{campaign_mold:'ss'},500);
      errorCampaignTest('开始时间',{start_time:chance.date({year: nowYear, month: nowMonth -1})});
      errorCampaignTest('结束时间',{end_time:chance.date({year: nowYear, month: nowMonth -1})});
    });
  });
};




