'use strict';

var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var ActivityTemplate  = mongoose.model('ActivityTemplate');
var PollTemplate  = mongoose.model('PollTemplate');
var QuestionTemplate  = mongoose.model('QuestionTemplate');
var chance = require('chance').Chance();
var molds = ['其它','羽毛球','篮球','阅读','自行车','下午茶','棋牌','足球','k歌','健身','美食','跑步','亲子','影视','摄影','旅行','桌游'];
var createInteractionTemplates = function (callback) {
  var templates = [];
  var now = new Date();
  var nowYear = now.getFullYear();
  var nowMonth = now.getMonth();
  async.parallel([
    function(cb){
      var template = new ActivityTemplate({
        theme: chance.string({length:10}),
        content: chance.paragraph(),
        location: { name : chance.address(), coordinates : [chance.longitude(), chance.latitude()]},
        startTime: chance.date({year: nowYear, month: nowMonth +1}),
        endTime: chance.date({year: nowYear, month: nowMonth +3}),
        activityMold: molds[chance.integer({min: 0, max: 15})],
        memberMin: chance.integer({min: 0, max: 4}),
        memberMax: chance.integer({min: 5, max: 10}),
        deadline: chance.date({year: nowYear, month: nowMonth +2}),
        tags:[chance.string({length:5})]
      });
      template.save(function(err) {
        cb(err,template)
      })
    },
    function(cb){
      var pollTemplate = new PollTemplate({
        theme: chance.string({length:10}),
        content: chance.paragraph(),
        endTime: chance.date({year: nowYear, month: nowMonth +3}),
        tags: [chance.string({length:5})],
        option: [{index:1,value:chance.string({length:5})},{index:2,value:chance.string({length:5})},{index:3,value:chance.string({length:5})}]
      });
      pollTemplate.save(function(err) {
        cb(err,pollTemplate)
      })
    },
    function(cb){
      var questionTemplate = new QuestionTemplate({
        theme: chance.string({length:10}),
        content: chance.paragraph(),
        endTime: chance.date({year: nowYear, month: nowMonth +3}),
        tags: [chance.string({length:5})]
      });
      questionTemplate.save(function(err) {
        cb(err,questionTemplate)
      })
    }
  ],callback);
}
module.exports = createInteractionTemplates;