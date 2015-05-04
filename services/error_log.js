'use strict';

var mongoose = require('mongoose'),
  ErrorStatistics = mongoose.model('ErrorStatistics');

module.exports = function (err) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(err.stack || err);

    var log = new ErrorStatistics({
      error: {
        body: err.stack || err
      }
    });
    log.save(function(err) {
      if (err) console.log(err);
    });

  }
};