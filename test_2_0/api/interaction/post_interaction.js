var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');
var chance = require('chance').Chance();
var util = require('util');
module.exports = function () {
  describe('post /interaction', function () {
    var accessToken;
    var now = new Date();
    var nowYear = now.getFullYear();
    var nowMonth = now.getMonth();
    var data;
    before(function (done) {
      data = dataService.getData();
      var user = data[0].users[2];
      request.post('/users/login')
        .send({
          phone: user.phone,
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
    it('应该成功发公司活动', function (done) {
      request.post('/interaction')
        .field("type", 1)
        .field("targetType", 3)
        .field("target", data[0].model.id)
        .field("theme", chance.string({length: 10}))
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
          res.body.should.have.properties('interactionId');
          done();
        });
    });
    it('应该成功发私有活动', function (done) {
      request.post('/interaction')
        .field("type", 1)
        .field("targetType", 2)
        .field("target", data[0].teams[2].model.id)
        .field("theme", chance.string({length: 10}))
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
          res.body.should.have.properties('interactionId');
          done();
        });
    });
    it('应该成功用模板发活动', function (done) {
      var templates = dataService.getTemplate();
      request.post('/interaction')
        .field("type", 1)
        .field("targetType", 3)
        .field("target", data[0].model.id)
        .field("templateId", templates[0].id)
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('interactionId');
          done();
        });
    });
    it('应该成功发投票', function (done) {
      request.post('/interaction')
        .field("type", 2)
        .field("targetType", 3)
        .field("target", data[0].model.id)
        .field("theme", chance.string({length: 10}))
        .field("content", chance.paragraph())
        .field('option[0]', chance.string({length: 5}))
        .field('option[1]', chance.string({length: 5}))
        .field('option[2]', chance.string({length: 5}))
        .field("tags", chance.string({length: 5})+","+chance.string({length: 5}))
        .field("startTime", chance.date({year: nowYear, month: nowMonth +1}).toString())
        .field("endTime", chance.date({year: nowYear, month: nowMonth +2}).toString())
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          console.log(res.body)
          if (err) return done(err);
          res.body.should.have.properties('interactionId');
          done();
        });
    });
    it('应该成功发求助', function (done) {
      request.post('/interaction')
        .field("type", 3)
        .field("targetType", 3)
        .field("target", data[0].model.id)
        .field("theme", chance.string({length: 10}))
        .field("content", chance.paragraph())
        .field("tags", chance.string({length: 5})+","+chance.string({length: 5}))
        .field("startTime", chance.date({year: nowYear, month: nowMonth +1}).toString())
        .field("endTime", chance.date({year: nowYear, month: nowMonth +2}).toString())
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(200)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.should.have.properties('interactionId');
          done();
        });
    });
    it('发其他公司互动时活动应该返回403', function (done) {
      request.post('/interaction')
        .field("type", 3)
        .field("targetType", 3)
        .field("target", data[1].model.id)
        .field("theme", chance.string({length: 10}))
        .field("content", chance.paragraph())
        .field("tags", chance.string({length: 5})+","+chance.string({length: 5}))
        .field("startTime", chance.date({year: nowYear, month: nowMonth +1}).toString())
        .field("endTime", chance.date({year: nowYear, month: nowMonth +2}).toString())
        .attach('photo', __dirname + '/test_photo.png')
        .set('x-access-token', accessToken)
        .expect(403)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.have.equal("您不能与其他学校进行互动");
          done();
        });
    });
    var errorInteractionTest = function (theme, interactionData, expectStatus) {
      var _expectStatus = expectStatus !=undefined ? expectStatus : 400;
      var msg = util.format('应该在数据%s错误时返回%s', theme, _expectStatus);
      it(msg, function (done) {
        var _interactionData = {
          type: interactionData.type || 3,
          targetType: interactionData.targetType || 3,
          target: interactionData.target || data[0].model.id,
          theme: interactionData.theme ===null ? null : chance.string({length: 10}),
          content:interactionData.content || chance.paragraph(),
          tags: interactionData.tags || chance.string({length: 5})+","+chance.string({length: 5}),
          endTime: interactionData.endTime ? interactionData.endTime.toString() : chance.date({year: nowYear, month: nowMonth +2}).toString()
        }
        if(interactionData.type===1) {
          _interactionData.location = interactionData.location || chance.address()
          _interactionData.longitude = interactionData.longitude || chance.longitude()
          _interactionData.latitude = interactionData.latitude || chance.latitude()
          _interactionData.startTime = interactionData.startTime ? interactionData.startTime.toString() : chance.date({year: nowYear, month: nowMonth +1}).toString()
        }
        else if(interactionData.type===2) {
          _interactionData.option = interactionData.option || chance.string({length: 5})+","+chance.string({length: 5})+","+chance.string({length: 5})+","+chance.string({length: 5})
        }
        var _request=request.post('/interaction')
        for( var field in _interactionData) {
          if(_interactionData[field])
            _request = _request.field(field,_interactionData[field]);
        }
        _request
        .set('x-access-token', accessToken)
        .expect(_expectStatus)
        .end(function (err, res) {
          if (err) return done(err);
          res.body.msg.should.be.type('string');
          done();
        });
      });
    };
    errorInteractionTest('互动类型',{type: 5});
    errorInteractionTest('目标id',{target: 's'});
    errorInteractionTest('目标类型为群组，目标id为公司',{targetType:2},403);
    errorInteractionTest('主题',{theme:null});
    errorInteractionTest('选项',{type:2, option:"dd"});
    errorInteractionTest('开始时间',{type:1, startTime:chance.date({year: nowYear, month: nowMonth -1})});
    errorInteractionTest('结束时间',{type:1, endTime:chance.date({year: nowYear, month: nowMonth -1})});
  })
}