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


  });
};

