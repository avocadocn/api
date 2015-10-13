var walk = require('../support/walk.js');

describe('api users', function () {

  walk(__dirname + '/users/', function (file, path) {
    require(path)();
  });

});