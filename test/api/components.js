var walk = require('../support/walk.js');

describe('api components', function () {

  walk(__dirname + '/components/', function (file, path) {
    require(path)();
  });

});