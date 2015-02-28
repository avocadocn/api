'use strict';

var fs = require('fs');
var url = require('url');

var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var moment = require('moment');
var cors = require('cors');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/donler-beta');

// custom middlewares
var token = require('./services/token.js');

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
walk('./models');

var app = express();

// app config
app.set('root', __dirname);
app.set('tokenSecret', 'donler');
app.set('tokenExpires',1000 * 60 * 60 * 24 * 7);

app.use(cors({
  methods: ['GET', 'PUT', 'PATCH', 'POST', 'DELETE']
}));
app.use(morgan('dev'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(token.verifying(app));

var controllers = {};
walk('./controllers', function (file, path) {
  var ctrlName = file.split('.')[0];
  controllers[ctrlName] = require(path);
});

walk('./routes', function (file, path) {
  var routeName = file.split('.')[0];
  var ctrl;
  if (controllers[routeName]) {
    ctrl = controllers[routeName](app);
  }
  require(path)(app, ctrl);
});

app.use(serveStatic('public'));
app.listen(3002);
console.log('api server listen at port 3002');
