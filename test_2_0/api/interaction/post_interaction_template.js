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
      var theme = chance.string({length: 10})
      request.post('/interaction/template')
        .field("templateType", 1)
        .field("theme", theme)
        .field("location", chance.address())
        .field("longitude", chance.longitude())
        .field("latitude", chance.latitude())
        .field("activityMold", chance.latitude({length: 5}))
        .field("content", chance.paragraph())
        .field("tags", chance.string({length: 5})+","+chance.string({length: 5}))
        .field("startTime", chance.date({year: nowYear, month: nowMonth +1}).toString())
        .field("endTime", chance.date({year: nowYear, month: nowMonth +2}).toString())
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.theme.should.equal(theme);
          done();
        });
    });
    
    it('应该成功发投票模板', function (done) {
      var theme = chance.string({length: 10})
      request.post('/interaction/template')
        .field("templateType", 2)
        .field("theme", theme)
        .field("content", chance.paragraph())
        .field("tags", chance.string({length: 5})+","+chance.string({length: 5}))
        .field("option", chance.string({length: 5})+","+chance.string({length: 5})+","+chance.string({length: 5})+","+chance.string({length: 5}))
        .field("startTime", chance.date({year: nowYear, month: nowMonth +1}).toString())
        .field("endTime", chance.date({year: nowYear, month: nowMonth +2}).toString())
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.theme.should.equal(theme);
          done();
        });
    });
    it('应该成功发求助模板', function (done) {
      var theme = chance.string({length: 10})
      request.post('/interaction/template')
        .field("templateType", 3)
        .field("theme", theme)
        .field("content", chance.paragraph())
        .field("tags", chance.string({length: 5})+","+chance.string({length: 5}))
        .field("startTime", chance.date({year: nowYear, month: nowMonth +1}).toString())
        .field("endTime", chance.date({year: nowYear, month: nowMonth +2}).toString())
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.theme.should.equal(theme);
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
          tags: interactionData.tags || chance.string({length: 5})+","+chance.string({length: 5}),
          endTime: interactionData.endTime? interactionData.endTime.toString() : chance.date({year: nowYear, month: nowMonth +2}).toString()
        }
        if(interactionData.templateType===1) {
          _interactionData.location = interactionData.location || chance.address()
          _interactionData.longitude = interactionData.longitude || chance.longitude()
          _interactionData.latitude = interactionData.latitude || chance.latitude()
          _interactionData.activityMold = interactionData.activityMold ===null ? null :chance.string({length: 5})
          _interactionData.startTime = interactionData.startTime ? interactionData.startTime.toString() : chance.date({year: nowYear, month: nowMonth +1}).toString()
        }
        else if(interactionData.templateType===2) {
          _interactionData.option = interactionData.option || chance.string({length: 5})+","+chance.string({length: 5})+","+chance.string({length: 5})+","+chance.string({length: 5})
        }
        var _request=request.post('/interaction/template')
        for( var field in _interactionData) {
          if(_interactionData[field])
            _request = _request.field(field,_interactionData[field]);
        }
        _request
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