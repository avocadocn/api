var walk = require('../support/walk.js');

describe('api photos', function () {

  walk(__dirname + '/photos/', function (file, path) {
    require(path)();
  });

});
