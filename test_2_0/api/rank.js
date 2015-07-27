var walk = require('../support/walk.js');

describe('api rank', function () {

  walk(__dirname + '/rank/', function (file, path) {
   require(path)();
  });

});
