'use strict';

var path = require('path');
var config;

switch (process.env.NODE_ENV) {
case 'production':
  config = require(path.join(__dirname, 'production'));
  break;
case 'test':
  config = require(path.join(__dirname, 'test'));
  break;
default:
  config = require(path.join(__dirname, 'development'));
  break;
}
config.rootPath = path.join(__dirname, '../');
module.exports = config;