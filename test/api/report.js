var walk = require('../support/walk.js');

describe('api report', function () {

  walk(__dirname + '/report/', function (file, path) {
    require(path)();
  });

});