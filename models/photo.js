'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Photo = new Schema({
  photo_album: Schema.Types.ObjectId,
  owner: {
    companies: [Schema.Types.ObjectId],
    teams: [Schema.Types.ObjectId]
  },
  uri: String,
  upload_date: {
    type: Date,
    default: Date.now
  },
  hidden: {
    type: Boolean,
    default: false
  },
  click: {
    type: Number,
    default: 0
  },
  name: String,
  tags: [String],
  upload_user: {
    _id: Schema.Types.ObjectId,
    name: String,
    type: {
      type: String,
      enum: ['user', 'hr']
    }
  }
});

mongoose.model('Photo', Photo);

