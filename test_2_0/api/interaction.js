var walk = require('../support/walk.js');

describe.skip('api interaction', function () {

  walk(__dirname + '/interaction/', function (file, path) {
    require(path)();
  });

});