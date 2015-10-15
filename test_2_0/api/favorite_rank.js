var walk = require('../support/walk.js');

describe('api favorite_rank', function () {

  walk(__dirname + '/favorite_rank/', function (file, path) {
    require(path)();
  });

});