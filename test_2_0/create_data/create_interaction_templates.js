'use strict';

var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var ActivityTemplate  = mongoose.model('ActivityTemplate');
var PollTemplate  = mongoose.model('PollTemplate');
var QuestionTemplate  = mongoose.model('QuestionTemplate');
var chance = require('chance').Chance();
var createInteractionTemplates = function (callback) {
  var templates = [];
  //   async.parallel([
  //   function(cb){
  //     var template = new ActivityTemplate({
  //       theme: chance.string({length:10}),
  //       content: chance.paragraph(),
  //       location: data.location,
  //       startTime: data.startTime,
  //       endTime: data.endTime,
  //       activityMold: data.activityMold,
  //       memberMin: data.memberMin,
  //       memberMax: data.memberMax,
  //       deadline: data.deadline,
  //       tags:data.tags
  //     });
  //     template.save(function(err) {
  //       cb(err,template)
  //     })
  //   },
  //   function(cb){
  //     var template = new PollTemplate({
  //       theme: data.theme,
  //       content: data.content,
  //       endTime: data.endTime,
  //       tags:data.tags
  //     });
  //     template.save(function(err) {
  //       cb(err,template)
  //     })
  //   },
  //   function(cb){
  //     var template = new QuestionTemplate({
  //       theme: data.theme,
  //       content: data.content,
  //       endTime: data.endTime,
  //       tags:data.tags
  //     });
  //     template.save(function(err) {
  //       cb(err,template)
  //     })
  //   }
  // ],callback);
  callback(null,templates)
}
module.exports = createInteractionTemplates;