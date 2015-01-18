'use strict';

var fs = require('fs');
var path = require('path');

var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var moment = require('moment');
var cors = require('cors');
var mongoose = require('mongoose');

var rootPath = path.join(__dirname, '../');
var config = require(path.join(rootPath, 'config/config.js'));

mongoose.connect(config.db);

// custom middlewares
var token = require(path.join(rootPath, 'services/token.js'));

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
// 初始化 mongoose models
walk(path.join(rootPath, 'models/'));

var app = express();

// app config
app.set('root', rootPath);
app.set('tokenSecret', config.token.secret);
app.set('tokenExpires', config.token.expires);

app.use(cors({
  methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE']
}));
app.use(morgan('dev'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(token.verifying(app));

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

app.use(serveStatic(path.join(rootPath, 'public/')));
module.exports = app;
