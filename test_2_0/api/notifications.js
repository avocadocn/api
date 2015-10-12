var walk = require('../support/walk.js');

describe.skip('api notifications', function () {

  walk(__dirname + '/notifications/', function (file, path) {
    require(path)();
  });

});