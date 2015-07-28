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
        request.post('/interaction')
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
        request.post('/interaction')
          .send(questionData)
          .set('x-access-token', accessToken)
          .expect(200)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.should.have.properties('question');
            done();
          });
      });
      it('发其他公司互动时活动应该返回403', function (done) {
        var campaignData = {
          cid: data[1].model.id,
          type: 3,
          targetType: 3,
          target:data[0].model.id,
          theme:chance.string({length: 10}),
          content:chance.paragraph(),
          tags: [chance.string({length: 5}),chance.string({length: 5})],
          startTime:chance.date({year: nowYear, month: nowMonth +1}),
          endTime:chance.date({year: nowYear, month: nowMonth +2})
        }
        request.post('/interaction')
          .send(campaignData)
          .set('x-access-token', accessToken)
          .expect(403)
          .end(function (err, res) {
            if (err) return done(err);
            res.body.msg.should.have.equal("您没有权限发布该活动");
            done();
          });
      });
      var errorInteractionTest = function (theme, interactionData, expectStatus) {
        var _expectStatus = expectStatus !=undefined ? expectStatus : 400;
        var msg = util.format('应该在数据%s错误时返回%s', theme, _expectStatus);
        it(msg, function (done) {
          var _interactionData = {
            cid: interactionData.cid || interactionData.data[1].model.id,
            type: interactionData.type || 3,
            targetType: interactionData.targetType || 3,
            target: interactionData.target || data[0].model.id,
            theme:interactionData.theme || chance.string({length: 10}),
            content:interactionData.content || chance.paragraph(),
            tags: interactionData.tags || [chance.string({length: 5}),chance.string({length: 5})],
            startTime: interactionData.startTime || chance.date({year: nowYear, month: nowMonth +1}),
            endTime: interactionData.endTime || chance.date({year: nowYear, month: nowMonth +2})
          }
          if(interactionData.type===1) {
            _interactionData.location = interactionData.location || {
              name : chance.address(),
              coordinates : [chance.longitude(), chance.latitude()]
            }
            _interactionData.activityMold = interactionData.activityMold || chance.string({length: 5})
          }
          else if(interactionData.type===2) {
            _interactionData.option = interactionData.option || [chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5}),chance.string({length: 5})]
          }
          request.post('/interaction')
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

      errorInteractionTest('公司id',{cid:null});
      errorInteractionTest('互动类型',{type: 5});
      errorInteractionTest('目标id',{target: 's'});
      errorInteractionTest('目标类型为群组，目标id为公司',{targetType:2});
      errorInteractionTest('主题',{theme:null});
      errorInteractionTest('活动模型',{type:1, campaign_mold:null});
      errorInteractionTest('选项',{type:2, option:"dd"});
      errorInteractionTest('开始时间',{start_time:chance.date({year: nowYear, month: nowMonth -1})});
      errorInteractionTest('结束时间',{end_time:chance.date({year: nowYear, month: nowMonth -1})});
    })
  })
}