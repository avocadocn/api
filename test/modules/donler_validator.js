var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/donler-beta-test');
require('../../models/region.js');
var donlerValidator = require('../../services/donler_validator.js');

describe('donlerValidator', function () {

  describe('email', function () {

    it('example@domain.com should be pass', function () {
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

    it('test.com should not be pass', function () {
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

});