'use strict';

var fs = require('fs');
var path = require('path');

var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var moment = require('moment');
var cors = require('cors');
var mongoose = require(path.join(__dirname, 'db.js'));

var rootPath = path.join(__dirname, '../');
var config = require(path.join(rootPath, 'config/config.js'));

// custom middlewares
var token = require(path.join(rootPath, 'services/token.js'));
var errorHandle = require(path.join(rootPath, 'services/error_handle.js'));

var app = express();

// app config
app.set('root', rootPath);
app.set('tokenSecret', config.token.secret);
app.set('tokenExpires', config.token.expires);


var whitelist = ['55yali.com', 'donler.com', 'donler.cn', 'localhost'];
var corsOpts = {
  origin: function(origin, callback) {
    if (origin) {
      var originIsWhitelisted = false;
      for (var i = 0, len = whitelist.length; i < len; i++) {
        originIsWhitelisted = origin.indexOf(whitelist[i]) !== -1;
        if (originIsWhitelisted) break;
      }
      callback(null, originIsWhitelisted);
    }
    else {
      callback(null, true);
    }
  },
  methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true
};
app.use(cors(corsOpts));

if (config.env === 'development') {
  app.use(morgan('dev'));
  app.use(serveStatic(path.join(rootPath, 'public/')));
} else if (config.env === 'production') {
  app.use(morgan('combined'));
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(token.verifying);

var controllers = {};

//walk controllers & routes
var controllers = {};

var walk = function(path, callback, folderFile) {
  fs.readdirSync(path).forEach(function(file) {
    var newPath = path + '/' + file;
    var stat = fs.statSync(newPath);
    if (stat.isFile()) {
      if (/(.*)\.(js$)/.test(file)) {
        if (callback) {
          callback(folderFile, file, newPath)
        } else {
          require(newPath);
        }
      }
    } else if (stat.isDirectory()) {
      walk(newPath, callback, file);
    }
  });
};
var versions = ['v1_3', 'v1_4'];

var routers = {};
versions.forEach(function(version) {
  //Set every attr in routers to be a router object;
  routers[version] = express.Router();
});
walk(path.join(rootPath, 'controllers'), function (version, file, path) {
  var ctrlName = file.split('.')[0];
  if(!controllers[ctrlName]) {
    controllers[ctrlName] = {};
  }
  controllers[ctrlName][version] = require(path)(app);
});

walk(path.join(rootPath, 'routes'), function (version, file, path) {
  var routeName = file.split('.')[0];
  var ctrl;
  if (controllers[routeName]) {
    ctrl = controllers[routeName];
  }
  require(path)(routers[version], ctrl);
});

app.use('/',routers['v1_3']);
versions.forEach(function(version) {
  app.use('/'+version, routers[version]);
  // console.log(routers[version]);
});

require('../services/schedule').init();

app.use(errorHandle);
module.exports = app;
