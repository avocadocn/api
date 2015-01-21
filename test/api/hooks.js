var createDataModule = require('../create_data');

before(function (done) {
  createDataModule.createData(function (err) {
    if (err) {
      console.log(err.stack);
    }
    done();
  });
});