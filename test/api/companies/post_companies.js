var app = require('../../../config/express.js'),
  request = require('supertest')(app);

var util = require('util');
var common = require('../../support/common');
var mongoose = common.mongoose;
var Company = mongoose.model('Company');
var dataService = require('../../create_data');
var chance = require('chance').Chance();

module.exports = function () {
  describe('post /companies', function () {
    it('应该在数据正确时返回201,数据库中应有此数据', function (done) {
      var newCompany = {
        "name": chance.string({length:8,pool: '上海北京啊地方睡觉啊的法律玩儿哦温热我人是否和比赛公司'}),
        "province": "安徽省",
        "city": "安庆市",
        "district": "大观区",
        "address": chance.string({pool: '阿飞离开爱诶哦入认为快乐1234567890'}),
        "contacts": chance.string({pool: '阿里斯顿父亲为哦如破去'}),
        "areacode": "021",
        "tel": chance.string({length:8,pool:'0123456789'}),
        "phone":chance.string({length:11,pool:'0123456789'}),
        "email": chance.email({domain: '55yali.com'})
      }
      request.post('/companies')
      .send(newCompany)
      .expect(201)
      .end(function (err, res) {
        if (err) return done(err + res.text);
        Company.findOne({'info.name':newCompany.name},function(err, company) {
          if(err) return done(err);
          else{
            company.email.domain[0].should.equal(newCompany.email.split('@')[1]);
            company.login_email.should.equal(newCompany.email);
            company.info.name.should.equal(newCompany.name);
            company.info.city.province.should.equal(newCompany.province);
            company.info.city.city.should.equal(newCompany.city);
            company.info.address.should.equal(newCompany.address);
            company.info.linkman.should.equal(newCompany.contacts);
            company.info.phone.should.equal(newCompany.phone);
            company.info.email.should.equal(newCompany.email);
            company.invite_key.should.have.length(8);
          }
          done();
        })
      })
    });

    var errorCompanyTest = function (theme, data) {
      var msg = util.format('应该在数据%s错误时返回400', theme)
      it(msg, function (done) {
        var data = dataService.getData();
        var company = data[0].model;
        var duplicateCompany = {
          "name": data.name? data.name : chance.string({length:8,pool: '上海北京啊地方睡觉啊的法律玩儿哦温热我人是否和比赛公司'}),
          "province": data.province ? data.province : "安徽省",
          "city": "安庆市",
          "district": "大观区",
          "address": data.addr ? data.addr: chance.string({pool: '阿飞离开爱诶哦入认为快乐1234567890'}),
          "contacts": data.contacts ? data.contacts : chance.string({pool: '阿里斯顿父亲为哦如破去'}),
          "areacode": data.areacode ? data.areacode : "021",
          "tel": data.tel ? data.tel : chance.string({length:8,pool:'0123456789'}),
          "phone": data.phone ? data.phone : chance.string({length:11,pool:'0123456789'}),
          "email": data.email ? data.email : company.login_email
        }
        request.post('/companies')
        .send(duplicateCompany)
        .expect(400)
        .end(function (err, res) {
          if (err) return done(err);
          //xxx should xxx
          res.body.msg.should.be.type('string');
          done();
        })
      });
    };

    errorCompanyTest('公司名',{name:''});//公司名不填
    errorCompanyTest('地址',{address: ''});//地址不填
    errorCompanyTest('省市区',{province: '洛杉矶市'});//省乱填
    errorCompanyTest('联系人',{contacts:''});//联系人不填
    errorCompanyTest('区号',{areacode:'asdf'});//区号不是数字
    errorCompanyTest('电话',{areacode:'asdf'});//电话不是数字
    errorCompanyTest('邮箱后缀',{email:'asdf@asdf.com'});//邮箱后缀错误
    errorCompanyTest('邮箱格式',{email:'asldfjaf'});//邮件乱填

  });
};