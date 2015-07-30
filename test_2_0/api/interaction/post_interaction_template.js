var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
module.exports = function () {
  describe('post /interaction/template', function () {
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
    it('应该成功发活动模板', function (done) {
      var campaignData = {
        templateType: 1,
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
      request.post('/interaction/template')
        .send(campaignData)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.theme.should.equal(campaignData.theme);
          done();
        });
    });
    
    it('应该成功发投票模板', function (done) {
      var pollData = {
        templateType: 2,
        theme:chance.string({length: 10}),
        content:chance.paragraph(),
        option:[chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5})],
        tags: [chance.string({length: 5}),chance.string({length: 5})],
        startTime:chance.date({year: nowYear, month: nowMonth +1}),
        endTime:chance.date({year: nowYear, month: nowMonth +2})
      }
      request.post('/interaction/template')
        .send(pollData)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.theme.should.equal(pollData.theme);
          done();
        });
    });
    it('应该成功发求助模板', function (done) {
      var questionData = {
        templateType: 3,
        theme:chance.string({length: 10}),
        content:chance.paragraph(),
        tags: [chance.string({length: 5}),chance.string({length: 5})],
        startTime:chance.date({year: nowYear, month: nowMonth +1}),
        endTime:chance.date({year: nowYear, month: nowMonth +2})
      }
      request.post('/interaction/template')
        .send(questionData)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.theme.should.equal(questionData.theme);
          done();
        });
    });
    var errorInteractionTest = function (theme, interactionData, expectStatus) {
      var _expectStatus = expectStatus !=undefined ? expectStatus : 400;
      var msg = util.format('应该在数据%s错误时返回%s', theme, _expectStatus);
      it(msg, function (done) {
        var _interactionData = {
          templateType: interactionData.templateType || 3,
          targetType: interactionData.targetType || 3,
          target: interactionData.target || data[0].model.id,
          theme: interactionData.theme ===null ? null : chance.string({length: 10}),
          content:interactionData.content || chance.paragraph(),
          tags: interactionData.tags || [chance.string({length: 5}),chance.string({length: 5})],
          endTime: interactionData.endTime || chance.date({year: nowYear, month: nowMonth +2})
        }
        if(interactionData.templateType===1) {
          _interactionData.location = interactionData.location || {
            name : chance.address(),
            coordinates : [chance.longitude(), chance.latitude()]
          }
          _interactionData.activityMold = interactionData.activityMold ===null ? null :chance.string({length: 5})
          _interactionData.startTime = interactionData.startTime || chance.date({year: nowYear, month: nowMonth +1})
        }
        else if(interactionData.templateType===2) {
          _interactionData.option = interactionData.option || [chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5})]
        }
        request.post('/interaction/template')
          .send(_interactionData)
          .set('x-access-token', accessToken)
          .expect(_expectStatus)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.be.type('string');
            done();
          });
      });
    };
    errorInteractionTest('模板类型',{templateType: 5});
    errorInteractionTest('主题',{theme:null});
    errorInteractionTest('活动模型',{templateType:1, activityMold:null});
    errorInteractionTest('选项',{templateType:2, option:"dd"});
    errorInteractionTest('开始时间',{templateType:1, startTime:chance.date({year: nowYear, month: nowMonth -1})});
    errorInteractionTest('结束时间',{templateType:1, endTime:chance.date({year: nowYear, month: nowMonth -1})});
  })
}