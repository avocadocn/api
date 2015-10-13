var walk = require('../support/walk.js');

describe('api companies', function () {

  walk(__dirname + '/companies/', function (file, path) {
    require(path)();
  });

});