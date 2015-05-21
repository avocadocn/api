var walk = require('../support/walk.js');

describe('api timeline', function () {

  walk(__dirname + '/timeline/', function (file, path) {
    require(path)();
  });

});