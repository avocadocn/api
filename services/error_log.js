'use strict';

module.exports = function (err) {
  // todo
  if (err.stack && process.env.NODE_ENV !== 'test') {
    console.log(err);
    console.log(err.stack);
  }
};