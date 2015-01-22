var walk = require('../support/walk.js');

describe('api campaigns', function () {

  walk(__dirname + '/campaigns/', function (file, path) {
    require(path)();
  });

});