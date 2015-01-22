var walk = require('../support/walk.js');

describe('services', function () {
  walk(__dirname + '/services/', function (file, path) {
    require(path)();
  });
});
