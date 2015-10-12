var walk = require('../support/walk.js');

describe.skip('api groups', function () {

  walk(__dirname + '/groups/', function (file, path) {
    require(path)();
  });

});