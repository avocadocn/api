var createDataModule = require('../create_data');

var common = require('../support/common.js');
var config = common.config;
var mongoose = require('mongoose');
var connect = mongoose.createConnection(config.db);


before(function (done) {
  this.timeout(60 * 1000);
  connect.on('open', function () {
    connect.db.dropDatabase(function (err, res) {
      if (err) {
        console.log(err.stack);
        done('drop database failed');
      }

      createDataModule.createData(function (err) {
        if (err) {
          console.log(err.stack);
        }
        done();
      });

    });
  });

});