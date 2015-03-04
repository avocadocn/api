var walk = require('../support/walk.js');

describe('api chats', function () {

  walk(__dirname + '/chats/', function (file, path) {
    require(path)();
  });

});