'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LogShema = new Schema({
  log_type:{
    'type': String,
    enum: ['userlog','joinCampaign','quitCampaign']
  },
  userid: {
    type: Schema.Types.ObjectId,
    ref:'User'
  },
  cid: {
    type: Schema.Types.ObjectId,
    ref:'Company'
  },
  role:{
    'type': String,
    enum: ['hr','user']
  },
  campaignid:{
    type: Schema.Types.ObjectId
  },
  ip:String,
  created: {
    type: Date,
    default: Date.now
  }
});


mongoose.model('Log', LogShema);