var walk = require('../support/walk.js');

describe('api competiton_messages', function () {

  walk(__dirname + '/competiton_messages/', function (file, path) {
    require(path)();
  });

});