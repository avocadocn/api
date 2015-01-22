'use strict';

module.exports = function (err) {
  // todo
  console.log(err);
  if (err.stack && process.env.NODE_ENV !== 'test') {
    console.log(err.stack);
  }
};