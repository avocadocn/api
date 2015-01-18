'use strict';

var path = require('path');
var app = require(path.join(__dirname, 'config/express.js'));
var config = require(path.join(__dirname, 'config/config.js'));

app.listen(config.serverListenPort);
console.log('api server is listening 3002');