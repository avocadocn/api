var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
module.exports = function () {
  describe('put /campaigns/:campaignId', function () {

    describe('用户编辑活动', function () {
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
      it('应该成功编辑活动', function (done) {
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
          .set('x-access-token', accessToken)
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
    });
    describe('hr编辑活动', function () {
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







