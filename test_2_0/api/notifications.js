var walk = require('../support/walk.js');

describe('api notifications', function () {

  walk(__dirname + '/notifications/', function (file, path) {
    require(path)();
  });

});