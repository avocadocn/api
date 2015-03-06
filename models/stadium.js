'use strict';

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var Stadium = new Schema({
  // 场馆名称
  name: {
    type: String,
    required: true
  },

  // 精确地址
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [],
    city: {//省市区
      province: String,
      city: String,
      district: String
    },
    name: String // 详细地址
  },

  // 同Group的group_type属性
  group_type: String,

  // 简介
  introduce: String,

  status: {
    type: String,
    enum: ['active', 'delete'],
    default: 'active'
  }
});

mongoose.model('Stadium', Stadium);