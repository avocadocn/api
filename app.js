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

// 设置通用模块，减少重复的require
var modules = {
  mongoose: mongoose,
  fs: fs,
  path: require('path')
};

app.use(morgan('dev'));

// 初始化 controllers
var controllerFileNames = fs.readdirSync('./controllers');
controllerFileNames.forEach(function (fileName) {
  require('./controllers/' + fileName)(app, modules);
});

app.use(serveStatic('public'));
app.listen(3002);
console.log('api server listen at port 3002');
