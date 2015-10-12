var walk = require('../support/walk.js');

describe.skip('api search', function () {

  walk(__dirname + '/search/', function (file, path) {
    require(path)();
  });

});