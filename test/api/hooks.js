var createDataModule = require('../create_data');
var common = require('../support/common.js');
var mongoose = require('mongoose');

before(function (done) {
  this.timeout(10 * 1000);
  mongoose.connection.db.dropDatabase(function (err, result) {
    if (err) {
      console.log(err.stack);
    }
    console.log(result);

    createDataModule.createData(function (err) {
      if (err) {
        console.log(err.stack);
      }
      done();
    });

  });

});