'use strict';

var fs = require('fs');
var url = require('url');

var express = require('express');
var serveStatic = require('serve-static');
var morgan = require('morgan');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/donler-beta');

// 初始化 mongoose models
var modelFileNames = fs.readdirSync('./models');
modelFileNames.forEach(function (fileName) {
  require('./models/' + fileName);
});

var app = express();
app.set('root', __dirname)

app.use(morgan('dev'));

var controllers = {};
var controllerFileNames = fs.readdirSync('./controllers');
controllerFileNames.forEach(function (fileName) {
  var ctrlName = fileName.split('.')[0];
  controllers[ctrlName] = require('./controllers/' + fileName);
});

// 初始化 routes
var routeFileNames = fs.readdirSync('./routes');
routeFileNames.forEach(function (fileName) {
  var routeName = fileName.split('.')[0];
  var ctrl;
  if (controllers[routeName]) {
    ctrl = controllers[routeName](app);
  }
  require('./routes/' + fileName)(app, ctrl);
});

app.use(serveStatic('public'));
app.listen(3002);
console.log('api server listen at port 3002');
