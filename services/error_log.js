'use strict';

module.exports = function (err) {
  // todo
  console.log(err);
  if (err.stack) {
    console.log(err.stack);
  }
};