var common = require('./common.js');

beforeEach(function (done) {
  common.getDataFromDB(function (err) {
    if (err) {
      console.log(err.stack);
    }
    done();
  });
});