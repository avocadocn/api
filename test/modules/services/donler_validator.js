var path = require('path');

var common = require('../../support/common.js');

var donlerValidator = require(path.join(common.config.rootPath, 'services/donler_validator.js'));

module.exports = function () {
  describe('donlerValidator', function () {

    describe('async validate task', function () {

      var asyncValidate = function (name, value, callback) {
        setTimeout(function () {
          callback(false, 'async msg');
        }, 10);
      };

      var syncValidate = function (name, value, callback) {
        callback(false, 'sync msg');
      };

      it('异步验证和同步验证都应该被执行', function (done) {
        donlerValidator({
          async: {
            name: 'async',
            value: 'test',
            validators: [asyncValidate]
          },
          sync: {
            name: 'sync',
            value: 'test',
            validators: [syncValidate]
          }
        }, 'complete', function (pass, msg) {
          msg.async.should.equal('async msg');
          msg.sync.should.equal('sync msg');
          done();
        });
      });

    });

    describe('complete mode', function () {

      it('所有的验证器都应该被执行', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: 'uncorrect@',
            validators: ['email']
          },
          number: {
            name: 'number',
            value: 'abc',
            validators: ['number']
          },
          sex: {
            name: 'sex',
            value: 'man',
            validators: ['sex']
          },
          correct: {
            name: 'pass',
            value: '123',
            validators: ['number']
          }
        }, 'complete', function (pass, msg) {
          msg.email.should.be.type('string');
          msg.number.should.be.type('string');
          msg.sex.should.be.type('string');
          (msg.correct === undefined).should.be.true;
        });
      });

    });

    describe('fast mode', function () {

      it('如果有一个验证失败了，验证应该立即结束', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: 'uncorrect@',
            validators: ['email']
          },
          number: {
            name: 'number',
            value: 'abc',
            validators: ['number']
          },
          sex: {
            name: 'sex',
            value: 'man',
            validators: ['sex']
          },
          correct: {
            name: 'pass',
            value: '123',
            validators: ['number']
          }
        }, 'fast', function (pass, msg) {
          pass.should.be.false;
          msg.email.should.be.type('string');
          (msg.number === undefined).should.be.true;
          (msg.sex === undefined).should.be.true;
          (msg.correct === undefined).should.be.true;
        });
      });

    });

    describe('required', function () {

      it('非空的值应该通过验证', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: 'example@domain.com',
            validators: ['required']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.true;
        });
      });

      it('""（空字符串）应该通过验证', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: '',
            validators: ['required']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.true;
        });
      });

      it('null不应该通过验证', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: null,
            validators: ['required']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.false;
        });
      });

      it('undefined不应该通过验证', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: undefined,
            validators: ['required']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.false;
        });
      });

    });

    describe('email', function () {

      it('example@domain.com应该通过验证', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: 'example@domain.com',
            validators: ['email']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.true;
        });
      });

      it('test.com不应该通过验证', function () {
        donlerValidator({
          email: {
            name: 'email',
            value: 'test.com',
            validators: ['email']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.false;
        });
      });

    });

    describe('number', function () {

      it('"12345678901"应该通过验证', function () {
        donlerValidator({
          phone: {
            name: 'phone',
            value: '12345678901',
            validators: ['number']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.true;
        });
      });

      it('"123abc"不应该通过验证', function () {
        donlerValidator({
          phone: {
            name: 'phone',
            value: '123abc',
            validators: ['number']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.false;
        });
      });

      it('"abc123"不应该通过验证', function () {
        donlerValidator({
          phone: {
            name: 'phone',
            value: 'abc123',
            validators: ['number']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.false;
        });
      });

    });

    describe('sex', function () {
      it('"男"或"女"应该是有效的性别', function () {
        donlerValidator({
          sex1: {
            name: 'sex1',
            value: '男',
            validators: ['sex']
          },
          sex2: {
            name: 'sex2',
            value: '女',
            validators: ['sex']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.true;
        });
      });

      it('"man"和"woman"不是有效的性别', function () {
        donlerValidator({
          sex1: {
            name: '性别',
            value: 'man',
            validators: ['sex']
          },
          sex2: {
            name: 'sex',
            value: 'woman',
            validators: ['sex']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.false;
          msg.sex1.should.equal('性别无效');
          msg.sex2.should.equal('sex无效');
        });
      });
    });

    describe('date', function () {
      it('"2011-08-04"或"08/04/2011"应该是有效的日期', function () {
        donlerValidator({
          date1: {
            name: 'date1',
            value: '2011-08-04',
            validators: ['date']
          },
          date2: {
            name: 'date2',
            value: '08/04/2011',
            validators: ['date']
          }
        }, 'complete', function (pass, msg) {
          pass.should.be.true;
        });
      });

      it('"foo"和"2011-Jan-04"不是有效的日期', function () {
        donlerValidator({
          date1: {
            name: 'date1',
            value: 'foo',
            validators: ['date']
          },
          date2: {
            name: 'date2',
            value: '2011-foos-04',
            validators: ['date']
          }
        }, 'complete', function (pass, msg) {   
          pass.should.be.false;
          msg.date1.should.equal('date1不是有效的日期格式');
          msg.date2.should.equal('date2不是有效的日期格式');
        });
      });
    });

    describe('region', function() {
      it('"广西,梧州市,长洲区"应该是有效的省市区', function() {
        donlerValidator({
          region: {
            name: 'region',
            value: '广西,梧州市,长洲区',
            validators: ['region']
          }
        }, 'complete', function(pass, msg) {
          pass.should.be.true;
        });
      });

      it('"广西,福州市,长洲区"不是有效的省市区', function() {
        donlerValidator({
          region: {
            name: 'region',
            value: 'foo',
            validators: ['region']
          }
        }, 'complete', function(pass, msg) {
          pass.should.be.false;
          msg.region.should.equal('region不是有效的日期格式');
        });
      });
    });
  });
};

