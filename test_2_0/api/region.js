var walk = require('../support/walk.js');

describe.skip('api region', function () {

  walk(__dirname + '/region/', function (file, path) {
   require(path)();
  });

});
