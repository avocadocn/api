var walk = require('../support/walk.js');

describe.skip('api circles', function () {

  walk(__dirname + '/circles/', function (file, path) {
    require(path)();
  });

});