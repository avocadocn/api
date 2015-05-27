'use strict';

var fs = require('fs');
var path = require('path');

// var express = require('express');
var restify = require('restify');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var moment = require('moment');
// var cors = require('cors');
var mongoose = require(path.join(__dirname, 'db.js'));
var preflightEnabler = require('se7ensky-restify-preflight');
var rootPath = path.join(__dirname, '../');
var config = require(path.join(rootPath, 'config/config.js'));

// custom middlewares
var token = require(path.join(rootPath, 'services/token.js'));
var errorHandle = require(path.join(rootPath, 'services/error_handle.js'));

var walk = function(path, callback) {
  fs.readdirSync(path).forEach(function(file) {
    var newPath = path + '/' + file;
    var stat = fs.statSync(newPath);
    if (stat.isFile()) {
      if (/(.*)\.(js$)/.test(file)) {
        if (callback) {
          callback(file, newPath)
        } else {
          require(newPath);
        }
      }
    } else if (stat.isDirectory()) {
      walk(newPath, callback);
    }
  });
};

var app = restify.createServer();
// var app = express();

// app config
// app.set('root', rootPath);
// app.set('tokenSecret', config.token.secret);
// app.set('tokenExpires', config.token.expires);


var whitelist = ['55yali.com', 'donler.com', 'donler.cn', 'localhost', 'localhost:3000'];
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
// app.use(cors(corsOpts));
restify.CORS.ALLOW_HEADERS.push('Access-Control-Allow-Origin');
app.use(restify.CORS({
  origins: whitelist,
  credentials: true
  // headers: ['authorization', 'Access-Control-Allow-Origin']
}));
// restify.CORS.ALLOW_HEADERS.push('authorization');
app.use(restify.acceptParser(app.acceptable));
app.use(restify.fullResponse());
app.use(restify.authorizationParser());
app.use(restify.queryParser());
app.use(restify.bodyParser());
app.use(
  function crossOrigin(req,res,next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    return next();
  }
);
// preflightEnabler(app);
// function unknownMethodHandler(req, res ,err , next) {
//   if (req.method.toLowerCase() === 'options') {
//     var allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Origin', 'X-Requested-With', 'Authorization']; // added Origin & X-Requested-With & **Authorization**

//     if (res.methods.indexOf('OPTIONS') === -1) res.methods.push('OPTIONS');

//     res.header('Access-Control-Allow-Credentials', true);
//     res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
//     res.header('Access-Control-Allow-Methods', res.methods.join(', '));
//     res.header('Access-Control-Allow-Origin', req.headers.origin);

//     next();
//   }
//   else {
//     return res.send(new restify.MethodNotAllowedError());
//   }
// }

// app.on('MethodNotAllowed', unknownMethodHandler);


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
walk(path.join(rootPath, 'controllers/'), function (file, path) {
  var ctrlName = file.split('.')[0];
  controllers[ctrlName] = require(path);
});

walk(path.join(rootPath, 'routes/'), function (file, path) {
  var routeName = file.split('.')[0];
  var ctrl;
  if (controllers[routeName]) {
    ctrl = controllers[routeName](app);
  }
  require(path)(app, ctrl);
});
require('../services/schedule').init();
app.use(errorHandle);
module.exports = app;
