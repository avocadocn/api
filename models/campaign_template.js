'use strict';
//活动模板
var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var CampaignTemplate = new Schema({
  content: String,
  create_time: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('CampaignTemplate', CampaignTemplate);