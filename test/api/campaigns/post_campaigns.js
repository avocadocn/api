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
      it('个人发活动时不带tid应该返回400', function (done) {
        var data = dataService.getData();
        var campaignData = {
          cid: [data[0].model.id],
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
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.be.type('string');
            done();
          });
      });
      it('应该不能编辑已经开始的活动', function (done) {
        var data = dataService.getData();
        var campaign = data[0].teams[0].campaigns[1];
        var campaignData = {
          theme: chance.string({length: 10})
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动已经开始，无法进行编辑');
            done();
          });
      });
      it('人数上限小于下限时应该返回400', function (done) {
        var data = dataService.getData();
        var campaign = data[0].teams[0].campaigns[0];
        var campaignData = {
          member_min: chance.integer({min: 11, max: 15}),
          member_max: chance.integer({min: 1, max: 10})
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('人数上限不能小于下限');
            done();
          });
      });
      it('应该不编辑不能编辑的活动属性', function (done) {
        var data = dataService.getData();
        var campaign = data[0].teams[0].campaigns[0];
        var campaignData = {
          theme: chance.string({length: 10})
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.theme.should.equal(campaign.theme);
            done();
          });
      });
      it('应该在找不到活动时返回404', function (done) {
        request.put('/campaigns/111')
          .set('x-access-token', accessToken)
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('找不到该活动');
            done();
          });
      });

      it('应该在没有权限时返回403', function (done) {
        var data = dataService.getData();
        var campaign = data[0].campaigns[0];
        request.put('/campaigns/'+ campaign.id)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限获取该活动');
            done();
          });
      });
      var errorCampaignTest = function (theme, campaignData) {
        var msg = util.format('应该在数据%s错误时返回400', theme)
        it(msg, function (done) {
          var data = dataService.getData();
          var campaignData = {
            cid: campaignData.cid || [data[0].model.id],
            tid: campaignData.tid || [data[0].teams[0].model.id],
            campaign_type: campaignData.campaign_type || 2,
            theme: campaignData.theme || chance.string({length: 10}),
            location:campaignData.location || {
              name : chance.address(),
              coordinates : [chance.longitude(), chance.latitude()]
            },
            campaign_mold: campaignData.campaign_mold || data[0].teams[0].model.group_type,
            start_time: campaignData.start_time || chance.date({year: nowYear, month: nowMonth +1}),
            end_time: campaignData.end_time || chance.date({year: nowYear, month: nowMonth +2})
          }
          request.post('/campaigns')
            .send(campaignData)
            .set('x-access-token', accessToken)
            .expect(400)
            .end(function (err, res) {
              if (err) return done(err);
              console.log(res.body.msg);
              res.body.msg.should.be.type('string');
              done();
            });
        });
      };

      errorCampaignTest('公司id',{cid:[]});
      errorCampaignTest('活动类型',{campaign_type: 's'});
      errorCampaignTest('小队tid',{tid: []});
      errorCampaignTest('主题',{theme:chance.string({length: 20})});
      errorCampaignTest('活动模型',{campaign_mold:'asdf'});
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
      it('应该成功编辑公司活动', function (done) {
        var data = dataService.getData();
        var campaign = data[0].campaigns[0];
        var campaignData = {
          content: chance.sentence(),
          member_min: chance.integer({min: 11, max: 15}),
          member_max: chance.integer({min: 101, max: 105}),
          deadline: chance.date({year: nowYear, month: nowMonth +2,day:1}),
          tags: [chance.string(),chance.string()]
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.content.should.equal(campaignData.content);
            res.body.member_min.should.equal(campaignData.member_min);
            res.body.member_max.should.equal(campaignData.member_max);
            campaignData.deadline.should.eql(new Date(res.body.deadline));
            res.body.tags.should.eql(campaignData.tags);
            done();
          });
      });
      it('应该成功编辑小队活动', function (done) {
        var data = dataService.getData();
        var campaign = data[0].teams[0].campaigns[0];
        var campaignData = {
          content: chance.sentence(),
          member_min: chance.integer({min: 11, max: 15}),
          member_max: chance.integer({min: 101, max: 105}),
          deadline: chance.date({year: nowYear, month: nowMonth +2,day:1}),
          tags: [chance.string(),chance.string()]
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.content.should.equal(campaignData.content);
            res.body.member_min.should.equal(campaignData.member_min);
            res.body.member_max.should.equal(campaignData.member_max);
            campaignData.deadline.should.eql(new Date(res.body.deadline));
            res.body.tags.should.eql(campaignData.tags);
            done();
          });
      });
      it('应该不能编辑已经开始的活动', function (done) {
        var data = dataService.getData();
        var campaign = data[0].campaigns[1];
        var campaignData = {
          theme: chance.string({length: 10})
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('活动已经开始，无法进行编辑');
            done();
          });
      });
      it('人数上限小于下限时应该返回400', function (done) {
        var data = dataService.getData();
        var campaign = data[0].campaigns[0];
        var campaignData = {
          member_min: chance.integer({min: 11, max: 15}),
          member_max: chance.integer({min: 1, max: 10})
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('人数上限不能小于下限');
            done();
          });
      });
      it('应该不编辑不能编辑的活动属性', function (done) {
        var data = dataService.getData();
        var campaign = data[0].campaigns[0];
        var campaignData = {
          theme: chance.string({length: 10})
        }
        request.put('/campaigns/' + campaign.id)
          .send(campaignData)
          .set('x-access-token', hrAccessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.theme.should.equal(campaign.theme);
            done();
          });
      });
      it('应该在找不到活动时返回404', function (done) {
        request.put('/campaigns/111')
          .set('x-access-token', hrAccessToken)
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('找不到该活动');
            done();
          });
      });

      it('应该在没有权限时返回403', function (done) {
        var data = dataService.getData();
        var campaign = data[1].campaigns[0];
        request.put('/campaigns/'+ campaign.id)
          .set('x-access-token', hrAccessToken)
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




