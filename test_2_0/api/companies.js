var walk = require('../support/walk.js');

describe.skip('api companies', function () {

  walk(__dirname + '/companies/', function (file, path) {
    require(path)();
  });

});