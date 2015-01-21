'use strict';

var path = require('path');
var mongoose = require(path.join(__dirname, '../../config/db.js'));
var config = require(path.join(__dirname, '../../config/config.js'));
exports.mongoose = mongoose;
exports.config = config;
