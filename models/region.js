'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var _district = new Schema({
  id: String,
  name: String
});

var _city = new Schema({
  id: String,
  name: String,
  district: [_district]
});


var Province = new Schema({
  id: String,
  name: String,
  city: [_city]
});



mongoose.model('Region', Province);