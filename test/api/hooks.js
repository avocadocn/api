var createDataModule = require('../create_data');

before(function (done) {
  this.timeout(10 * 1000);

  createDataModule.createData(function (err) {
    if (err) {
      console.log(err.stack);
    }
    done();
  });

});