var path = require('path');

var common = require('../support/common.js');
var mongoose = common.mongoose;

var donlerValidator = require(path.join(common.config.rootPath, 'services/donler_validator.js'));

describe('services.donlerValidator', function () {

  describe('async validate task', function () {

    var asyncValidate = function (name, value, callback) {
      setTimeout(function () {
        callback(false, 'async msg');
      }, 10);
    };

    var syncValidate = function (name, value, callback) {
      callback(false, 'sync msg');
    };

    it('both async and sync task should be run', function (done) {
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

    it('all validator should be run', function () {
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

    it('should stop all tasks if a validate task failed ', function () {
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

    it('unnull field should pass ', function () {
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

    it('"" field should pass', function () {
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

    it('null field should not pass', function () {
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

    it('undefined field should not pass', function () {
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

    it('example@domain.com should pass', function () {
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

    it('test.com should not pass', function () {
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

    it('"12345678901" should pass', function () {
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

    it('"123abc" should not pass', function () {
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

    it('"abc123" should not pass', function () {
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

});