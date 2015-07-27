var walk = require('../support/walk.js');

describe('api messages', function () {

  walk(__dirname + '/messages/', function (file, path) {
    require(path)();
  });

});