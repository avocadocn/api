'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var ErrorStatisticsShema = new Schema({
  error: {
    target: {
      kind:{
        type: String,
        enum: ['company','user'],
      },
      _id: Schema.Types.ObjectId,
      name: String,
      username: String,
      email: String
    },
    kind: String,
    body: String,
    headers: Schema.Types.Mixed,
    method: String,
    url: String
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    'type': String,
    enum: ['active','delete'],
    default: 'active'
  }
});


mongoose.model('ErrorStatistics', ErrorStatisticsShema);