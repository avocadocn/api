var walk = require('../support/walk.js');

describe('modules business', function () {

  walk(__dirname + '/business/', function (file, path) {
    require(path)();
  });

});