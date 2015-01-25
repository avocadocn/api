var walk = require('../support/walk.js');

describe('api comments', function () {

  walk(__dirname + '/comments/', function (file, path) {
    require(path)();
  });

});