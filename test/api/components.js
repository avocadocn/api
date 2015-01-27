var walk = require('../support/walk.js');

describe('api messages', function () {

  walk(__dirname + '/components/', function (file, path) {
    require(path)();
  });

});