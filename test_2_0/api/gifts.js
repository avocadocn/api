var walk = require('../support/walk.js');

describe('api gifts', function () {

  walk(__dirname + '/gifts/', function (file, path) {
    require(path)();
  });

});