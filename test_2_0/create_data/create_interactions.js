'use strict';
var common = require('../support/common');
var tools = require('../../tools/tools');
var mongoose = common.mongoose;
var Interaction = mongoose.model('Interaction'),
    Activity = mongoose.model('PhotoAlbum'),
    Poll = mongoose.model('Poll'),
    Question = mongoose.model('Question');

var async = require('async');
var chance = require('chance').Chance();
var moment = require('moment');
var interactionTemplates;
var interactionTypes = ['activity','poll','question'];
var molds = ['其它','羽毛球','篮球','阅读','自行车','下午茶','棋牌','足球','k歌','健身','美食','跑步','亲子','影视','摄影','旅行','桌游'];
var now = new Date();
var nowYear = now.getFullYear();
var nowMonth = now.getMonth();
var iii =0;
/**
 * 创建活动,如果data中存在的使用data,否则使用template中的
 * @param  {Object} data      活动数据
 * @param  {Object} template  模板数据
 * @return {Activity}         活动Entity
 */
var createActivity = function (data,template) {
  template = template || {}
  var  _activity = {
    memberMin: template.memberMin || data.memberMin,
    memberMax: template.memberMax || data.memberMax,
    location: template.location || { name : chance.address(), coordinates : [chance.longitude(), chance.latitude()]},
    startTime: template.startTime || data.startTime,
    deadline: template.deadline || data.deadline,
    activityMold: template.activityMold || molds[chance.integer({min:0,max:15})]
  };
  return new Activity(_activity);
}
/**
 * 创建投票,如果data中存在的使用data,否则使用template中的
 * @param  {Object} data      投票数据
 * @param  {Object} template  模板数据
 * @return {Activity}         投票Entity
 */
var createPoll = function (data,template) {
  template = template || {}
  var option = [];
  if(template.option) {
    option = template.option;
  }
  else {
    option = [{index:1,value:chance.string({length:5})},{index:2,value:chance.string({length:5})},{index:3,value:chance.string({length:5})}]
  }
  var poll = new Poll({option:option});
  return poll;
}
/**
 * 创建求助 (目前没有属性需要创建)
 * @param  {Object} data      求助数据
 * @param  {Object} template  模板数据
 * @return {Activity}         求助Entity
 */
var createQuestion= function (data) {
  var question = new Question();
  return question;
}
var _createInteraction = function(data,timeType,template,callback) {
  var interaction = new Interaction({
    cid: data.cid,
    targetType: data.targetType,
    target: data.target.id,
    poster: {
      _id:data.users[0]
    },
    type: data.type,
    theme: chance.string(),
    content: chance.paragraph(),
    tags: [chance.string({length: 5}),chance.string({length: 5})],
    public: data.target.public || true,
    members:data.users
  });
  if(data.users.length>1)
    interaction.inviters =data.users.slice(1)
  var interactionContent;
  switch(data.type) {
    case 1:
      interactionContent = createActivity(data,template);
      break;
    case 2:
      interactionContent = createPoll(data,template);
      break;
    case 3:
      interactionContent = createQuestion(data,template);
      break;
  }
  switch(timeType) {
    //未开始
    case 1:
      interaction.endTime = chance.date({year: nowYear, month: nowMonth+2});
      if(data.type==1){
        interactionContent.startTime = chance.date({year: nowYear, month: nowMonth+1});
        interaction.deadline = chance.date({year: nowYear, month: nowMonth+2});
      }
      break;
    //正在进行
    case 2:
      interaction.endTime = chance.date({year: nowYear, month: nowMonth+2});
      if(data.type==1){
        interactionContent.startTime = chance.date({year: nowYear, month: nowMonth-1});
        interaction.deadline = chance.date({year: nowYear, month: nowMonth+2});
      }
      break;
    //结束
    case 3:
      interaction.endTime = chance.date({year: nowYear, month: nowMonth-1});
      if(data.type==1){
        interactionContent.startTime = chance.date({year: nowYear, month: nowMonth-2});
        interaction.deadline = chance.date({year: nowYear, month: nowMonth-1});
      }
      break;
  }
  async.parallel([
    function(cb) {
      interactionContent.save(cb)
    },
    function(cb) {
      interaction[interactionTypes[data.type-1]] = interactionContent._id;
      interaction.save(cb)
    }
  ],function(err,results) {
    callback(err,results[1])
  })
}

var createAllTimesInteractions = function(data, type, callback) {
  var _data = {
    targetType: data.targetType,
    target:data.target,
    users: data.users,
    cid: data.cid,
    type: type
  }
  async.parallel([
    function(cb){
      _createInteraction(_data, 1, null, cb);
    },
    function(cb){
      _createInteraction(_data, 1, interactionTemplates[type-1], cb);
    },
    function(cb){
      _createInteraction(_data, 2, null, cb);
    },
    
    function(cb){
      _createInteraction(_data, 3, null, cb);
    }
  ],callback);
}

var createAllTypeInteractions = function(data,callback) {
  async.parallel({
    //活动
    activities:function(cb){
      createAllTimesInteractions(data, 1, cb);
    },
    //投票
    polls:function(cb){
      createAllTimesInteractions(data, 2, cb);
    },
    //求助
    questions:function(cb){
      createAllTimesInteractions(data, 3, cb);
    }
  },callback);
}
var createInteractions = function (companyData, templates, callback) {
  interactionTemplates = templates;
  if(!companyData.model.status.mail_active) {
    return callback(null);
  }
  async.parallel({
    //创建公司互动
    companyInteractions: function(parallelCallback){
      var data =  {
        targetType: 3,
        target:companyData.model,
        users: [companyData.users[0]._id],
        cid: companyData.model.id
      }
      createAllTypeInteractions(data,function(err, results) {
        companyData.activities = results.activities;
        companyData.polls = results.polls;
        companyData.questions = results.questions;
        parallelCallback(err, 'companyInteractions');
      })
    },
    //创建小队互动
    teamInteractions: function(parallelCallback){
      async.mapLimit(companyData.teams,3,function(team,index,callback){
        var data =  {
          targetType: 2,
          target:team.model,
          users: [companyData.users[0]._id, companyData.users[1]._id],
          cid: companyData.model.id
        }
        createAllTypeInteractions(data,function(err, results) {
          team.activities = results.activities;
          team.polls = results.polls;
          team.questions = results.questions;
          callback(err, 'teamInteractions');
        })
      },parallelCallback);
    }
  },
  function(err, results) {
    
    callback(err)
  });

}
module.exports = createInteractions;