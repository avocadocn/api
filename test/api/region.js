var walk = require('../support/walk.js');

describe('api region', function () {

  walk(__dirname + '/region/', function (file, path) {
   require(path)();
  });

});
