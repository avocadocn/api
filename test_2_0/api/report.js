var walk = require('../support/walk.js');

describe.skip('api report', function () {

  walk(__dirname + '/report/', function (file, path) {
    require(path)();
  });

});