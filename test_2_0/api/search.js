var walk = require('../support/walk.js');

describe('api search', function () {

  walk(__dirname + '/search/', function (file, path) {
    require(path)();
  });

});