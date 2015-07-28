var walk = require('../support/walk.js');

describe('api circles', function () {

  walk(__dirname + '/circles/', function (file, path) {
    require(path)();
  });

});