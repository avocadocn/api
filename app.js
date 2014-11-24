'use strict';

var fs = require('fs');

var express = require('express');
var serveStatic = require('serve-static');
var swagger = require('swagger-node-express');

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/donler-beta');

// 初始化mongoose models
var mongooseModels = fs.readdirSync('./mongoose_models');
mongooseModels.forEach(function (model) {
  require('./mongoose_models/' + model);
});

var app = express();
swagger.setAppHandler(app);

// 添加swagger models
var swaggerModels = {
  models: {}
};
var swaggerModelFileNames = fs.readdirSync('./swagger_models');
swaggerModelFileNames.forEach(function (fileName) {
  var model = require('./swagger_models/' + fileName);
  for (var key in model) {
    swaggerModels.models[key] = model[key];
  }
});
swagger.addModels(swaggerModels);

// 设置通用模块，减少重复的require
var modules = {
  mongoose: mongoose
};

// 初始化资源
var srcFileNames = fs.readdirSync('./resources');
srcFileNames.forEach(function (fileName) {
  var src = require('./resources/' + fileName)(swagger, modules);

  for (var key in src) {
    switch (src[key].spec.method) {
    case 'GET':
      swagger.addGet(src[key]);
      break;
    case 'POST':
      swagger.addPost(src[key]);
      break;
    case 'PUT':
      swagger.addPut(src[key]);
      break;
    case 'PATCH':
      swagger.addPatch(src[key]);
      break;
    case 'DELETE':
      swagger.addDelete(src[key]);
      break;
    default:
      console.log('不支持该HTTP方法');
      break;
    }
  }

});

swagger.configureSwaggerPaths('', 'api-docs', '');
swagger.configure("http://localhost:3002", "0.0.1");
app.use(serveStatic('public'));
app.listen(3002);
console.log('api server listen at port 3002');
