var walk = require('../support/walk.js');

describe('api interaction', function () {

  walk(__dirname + '/interaction/', function (file, path) {
    require(path)();
  });

});