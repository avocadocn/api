var walk = require('../support/walk.js');

describe('api teams', function () {

  walk(__dirname + '/teams/', function (file, path) {
    require(path)();
  });

});