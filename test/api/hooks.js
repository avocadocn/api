var getData = require('../get_data');

before(function (done) {
  getData(function (err) {
    if (err) {
      console.log(err.stack);
    }
    done();
  });
});