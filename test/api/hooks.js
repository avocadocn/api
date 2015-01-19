var common = require('./common.js');

before(function (done) {
  common.getDataFromDB(function (err) {
    if (err) {
      console.log(err.stack);
    }
    done();
  });
});