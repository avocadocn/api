var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var common = require('../../support/common');
var mongoose = common.mongoose;
var Campaign = mongoose.model('Campaign');
module.exports = function () {
  describe('put /campaigns/:campaignId/dealProvoke', function () {

    describe('用户处理应战', function () {
      var accessToken;
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
      it('活动id不正确应该返回404', function (done) {
        request.put('/campaigns/111/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:1})
          .expect(404)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('找不到该活动');
            done();
          });
      });
      it('活动已经关闭应该返回400', function (done) {
        var campaign = data[0].teams[1].campaigns[3];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:1})
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('该活动已经被关闭');
            done();
          });
      });
      it('活动不是挑战应该返回400', function (done) {
        var campaign = data[0].teams[0].campaigns[0];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:1})
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('该活动不是挑战');
            done();
          });
      });
      it('该挑战已经被应战应该返回400', function (done) {
        var campaign = data[0].teams[1].campaigns[0];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:1})
          .expect(400)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('该挑战已经被应战');
            done();
          });
      });
      it('非队长处理应战应该返回403', function (done) {
        var campaign = data[1].teams[1].campaigns[6];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:3})
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限处理该挑战');
            done();
          });
      });
      it('被挑战队长取消应战应该返回403', function (done) {
        var campaign = data[0].teams[1].campaigns[6];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:3})
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('您没有权限处理该挑战');
            done();
          });
      });
      it('接受应战应该成功', function (done) {
        var campaign = data[0].teams[1].campaigns[6];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:1})
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('成功');
            Campaign.findById(campaign.id).exec()
              .then(function (campaign) {
                campaign.campaign_unit[1].start_confirm.should.be.true;
                campaign.confirm_status.should.be.true;
                done();
              })
              .then(null, function (err) {
                done(err);
              });
          });
      });
      it('拒绝应战应该成功', function (done) {
        var campaign = data[0].teams[1].campaigns[7];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:2})
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('成功');
            Campaign.findById(campaign.id).exec()
              .then(function (campaign) {
                campaign.active.should.be.false;
                done();
              })
              .then(null, function (err) {
                done(err);
              });
          });
      });
    });
    describe('用户处理应战', function () {
      var accessToken;
      var data;
      before(function (done) {
        data = dataService.getData();
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
      it('取消应战应该成功', function (done) {
        var campaign = data[0].teams[1].campaigns[8];
        request.put('/campaigns/' + campaign.id+'/dealProvoke')
          .set('x-access-token', accessToken)
          .send({dealType:3})
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.equal('成功');
            Campaign.findById(campaign.id).exec()
              .then(function (campaign) {
                campaign.active.should.be.false;
                campaign.campaign_unit[0].start_confirm.should.be.false;
                done();
              })
              .then(null, function (err) {
                done(err);
              });
          });
      });
    });
  });
};

