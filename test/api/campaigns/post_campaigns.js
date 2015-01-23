var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var dataService = require('../../create_data');

module.exports = function () {
  describe('post /campaigns', function () {

    // describe('用户发活动', function () {
    //   var accessToken;
    //   var now = new Date();
    //   var nowYear = now.getFullYear();
    //   var nowMonth = now.getMonth();
    //   before(function (done) {
    //     var data = dataService.getData();
    //     var user = data[0].teams[0].leaders[0];
    //     request.post('/users/login')
    //       .send({
    //         email: user.email,
    //         password: '55yali'
    //       })
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         if (res.statusCode === 200) {
    //           accessToken = res.body.token;
    //         }
    //         done();
    //       });

    //   });
    //   it('应该成功发活动', function (done) {
    //     var data = dataService.getData();
    //     var campaignData = {
    //       cid: [data[0].model._id],
    //       tid: [data[0].teams[0].],
    //       campaign_type: 2,
    //       theme:,
    //       location:,
    //       campaign_mold:,
    //       start_time:,
    //       end_time:,
    //       content: chance.sentence(),
    //       member_min: chance.integer({min: 11, max: 15}),
    //       member_max: chance.integer({min: 101, max: 105}),
    //       deadline: chance.date({year: nowYear, month: nowMonth +2,day:1}),
    //       tags: [chance.string(),chance.string()]
    //     }
    //     request.post('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', accessToken)
    //       .expect(200)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.content.should.equal(campaignData.content);
    //         res.body.member_min.should.equal(campaignData.member_min);
    //         res.body.member_max.should.equal(campaignData.member_max);
    //         campaignData.deadline.should.eql(new Date(res.body.deadline));
    //         res.body.tags.should.eql(campaignData.tags);
    //         done();
    //       });
    //   });
    //   it('应该不能编辑已经开始的活动', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].teams[0].campaigns[1];
    //     var campaignData = {
    //       theme: chance.string({length: 10})
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', accessToken)
    //       .expect(400)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('活动已经开始，无法进行编辑');
    //         done();
    //       });
    //   });
    //   it('人数上限小于下限时应该返回400', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].teams[0].campaigns[0];
    //     var campaignData = {
    //       member_min: chance.integer({min: 11, max: 15}),
    //       member_max: chance.integer({min: 1, max: 10})
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', accessToken)
    //       .expect(400)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('人数上限不能小于下限');
    //         done();
    //       });
    //   });
    //   it('应该不编辑不能编辑的活动属性', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].teams[0].campaigns[0];
    //     var campaignData = {
    //       theme: chance.string({length: 10})
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', accessToken)
    //       .expect(200)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.theme.should.equal(campaign.theme);
    //         done();
    //       });
    //   });
    //   it('应该在找不到活动时返回404', function (done) {
    //     request.put('/campaigns/111')
    //       .set('x-access-token', accessToken)
    //       .expect(404)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('找不到该活动');
    //         done();
    //       });
    //   });

    //   it('应该在没有权限时返回403', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].campaigns[0];
    //     request.put('/campaigns/'+ campaign.id)
    //       .set('x-access-token', accessToken)
    //       .expect(403)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('您没有权限获取该活动');
    //         done();
    //       });
    //   });
    //   var errorCampaignTest = function (theme, data) {
    //     var msg = util.format('应该在数据%s错误时返回400', theme)
    //     it(msg, function (done) {
    //       var data = dataService.getData();
    //       var company = data[0].model;
    //       var duplicateCompany = {
    //         "name": data.name? data.name : chance.string({length:8,pool: '上海北京啊地方睡觉啊的法律玩儿哦温热我人是否和比赛公司'}),
    //         "province": data.province ? data.province : "安徽省",
    //         "city": "安庆市",
    //         "district": "大观区",
    //         "address": data.addr ? data.addr: chance.string({pool: '阿飞离开爱诶哦入认为快乐1234567890'}),
    //         "contacts": data.contacts ? data.contacts : chance.string({pool: '阿里斯顿父亲为哦如破去'}),
    //         "areacode": data.areacode ? data.areacode : "021",
    //         "tel": data.tel ? data.tel : chance.string({length:8,pool:'0123456789'}),
    //         "phone": data.phone ? data.phone : chance.string({length:11,pool:'0123456789'}),
    //         "email": data.email ? data.email : company.login_email
    //       }
    //       request.post('/companies')
    //       .send(duplicateCompany)
    //       .expect(400)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         //xxx should xxx
    //         res.body.msg.should.be.type('string');
    //         done();
    //       })
    //     });
    //   };

    //   errorCampaignTest('公司名',{name:''});//公司名不填
    //   errorCampaignTest('地址',{address: ''});//地址不填
    //   errorCampaignTest('省市区',{province: '洛杉矶市'});//省乱填
    //   errorCampaignTest('联系人',{contacts:''});//联系人不填
    //   errorCampaignTest('区号',{areacode:'asdf'});//区号不是数字
    //   errorCampaignTest('电话',{areacode:'asdf'});//电话不是数字
    //   errorCampaignTest('邮箱后缀',{email:'asdf@asdf.com'});//邮箱后缀错误
    //   errorCampaignTest('邮箱格式',{email:'asldfjaf'});//邮件乱填
    // });
    // describe('hr发活动', function () {
    //   var now = new Date();
    //   var nowYear = now.getFullYear();
    //   var nowMonth = now.getMonth();
    //   var hrAccessToken;

    //   before(function (done) {
    //     var data = dataService.getData();
    //     var hr = data[0].model;
    //     request.post('/companies/login')
    //       .send({
    //         username: hr.username,
    //         password: '55yali'
    //       })
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         if (res.statusCode === 200) {
    //           hrAccessToken = res.body.token;
    //         }
    //         done();
    //       });

    //   });
    //   it('应该成功编辑公司活动', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].campaigns[0];
    //     var campaignData = {
    //       content: chance.sentence(),
    //       member_min: chance.integer({min: 11, max: 15}),
    //       member_max: chance.integer({min: 101, max: 105}),
    //       deadline: chance.date({year: nowYear, month: nowMonth +2,day:1}),
    //       tags: [chance.string(),chance.string()]
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', hrAccessToken)
    //       .expect(200)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.content.should.equal(campaignData.content);
    //         res.body.member_min.should.equal(campaignData.member_min);
    //         res.body.member_max.should.equal(campaignData.member_max);
    //         campaignData.deadline.should.eql(new Date(res.body.deadline));
    //         res.body.tags.should.eql(campaignData.tags);
    //         done();
    //       });
    //   });
    //   it('应该成功编辑小队活动', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].teams[0].campaigns[0];
    //     var campaignData = {
    //       content: chance.sentence(),
    //       member_min: chance.integer({min: 11, max: 15}),
    //       member_max: chance.integer({min: 101, max: 105}),
    //       deadline: chance.date({year: nowYear, month: nowMonth +2,day:1}),
    //       tags: [chance.string(),chance.string()]
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', hrAccessToken)
    //       .expect(200)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.content.should.equal(campaignData.content);
    //         res.body.member_min.should.equal(campaignData.member_min);
    //         res.body.member_max.should.equal(campaignData.member_max);
    //         campaignData.deadline.should.eql(new Date(res.body.deadline));
    //         res.body.tags.should.eql(campaignData.tags);
    //         done();
    //       });
    //   });
    //   it('应该不能编辑已经开始的活动', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].campaigns[1];
    //     var campaignData = {
    //       theme: chance.string({length: 10})
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', hrAccessToken)
    //       .expect(400)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('活动已经开始，无法进行编辑');
    //         done();
    //       });
    //   });
    //   it('人数上限小于下限时应该返回400', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].campaigns[0];
    //     var campaignData = {
    //       member_min: chance.integer({min: 11, max: 15}),
    //       member_max: chance.integer({min: 1, max: 10})
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', hrAccessToken)
    //       .expect(400)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('人数上限不能小于下限');
    //         done();
    //       });
    //   });
    //   it('应该不编辑不能编辑的活动属性', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[0].campaigns[0];
    //     var campaignData = {
    //       theme: chance.string({length: 10})
    //     }
    //     request.put('/campaigns/' + campaign.id)
    //       .send(campaignData)
    //       .set('x-access-token', hrAccessToken)
    //       .expect(200)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.theme.should.equal(campaign.theme);
    //         done();
    //       });
    //   });
    //   it('应该在找不到活动时返回404', function (done) {
    //     request.put('/campaigns/111')
    //       .set('x-access-token', hrAccessToken)
    //       .expect(404)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('找不到该活动');
    //         done();
    //       });
    //   });

    //   it('应该在没有权限时返回403', function (done) {
    //     var data = dataService.getData();
    //     var campaign = data[1].campaigns[0];
    //     request.put('/campaigns/'+ campaign.id)
    //       .set('x-access-token', hrAccessToken)
    //       .expect(403)
    //       .end(function (err, res) {
    //         if (err) return done(err);
    //         res.body.msg.should.equal('您没有权限获取该活动');
    //         done();
    //       });
    //   });
    // });
  });
};

