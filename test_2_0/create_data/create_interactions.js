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
var templates;
var interactionTypes = ['activity','poll','question'];
var molds = ['其它','羽毛球','篮球','阅读','自行车','下午茶','棋牌','足球','k歌','健身','美食','跑步','亲子','影视','摄影','旅行','桌游'];
/**
 * 创建活动,如果data中存在的使用data,否则使用template中的
 * @param  {Object} data      活动数据
 * @param  {Object} template  模板数据
 * @return {Activity}         活动Entity
 */
var createActivity = function (data,template) {
  template = template || {}
  var  _activity = {
    memberMin: data.memberMin || template.memberMin,
    memberMax: data.memberMax || template.memberMax,
    location: data.location || template.location,
    startTime: data.startTime || template.startTime,
    deadline: data.deadline || template.deadline,
    activityMold: data.activityMold || template.activityMold
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
  var options = data.option || template.option;
  options && options.forEach(function(_option, index){
    option.push({
      index:index,
      value:_option
    })
  });
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
var _createInteraction = function(data,timeType,template,cb) {
  var interaction = new Interaction({
    cid: data.cid,
    targetType: data.targetType,
    target: data.target.id,
    poster: {
      _id:data.users[0]._id
    },
    type: data.type,
    theme: chance.string(),
    content: chance.paragraph(),
    tags: [chance.string({length: 5}),chance.string({length: 5})],
    public: data.target.public || true,
    members:[data.users[0]._id]
  });
  if(data.users.length>1)
    interaction.inviters =[data.users[1]._id]
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
  async.parallel([
    function(callback) {
      interactionContent.save(callback)
    },
    function(callback) {
      interaction[interactionTypes[data.type-1]] = interactionContent._id;
      interaction.save(callback)
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
  switch(type) {
    case 1:
      _data.location = { name : chance.address(), coordinates : [chance.longitude(), chance.latitude()]}
      break;
    case 2:
      
      break;
  }
  async.parallel([
    function(cb){
      _createInteraction(_data, 1, null, cb);
    },
    function(cb){
      _createInteraction(_data, 1, templates[type-1], cb);
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
      createCampaign(data, 2, cb);
    },
    //求助
    questions:function(cb){
      createCampaign(data, 3, cb);
    }
  },callback);
}
var createCompanyInteraction = function (companyData, callback) {
    if(!companyData.model.status.mail_active) {
      return callback(null,companyDataList);
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
        async.mapLimit(companyData.teams,3,function(team){
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
            parallelCallback(err, 'teamInteractions');
          })
        },parallelCallback);
      }
    },
    function(err, results) {
      callback(err,companyData)
    });

}
var createInteractions = function (companyDataList, templates, callback) {
  templates = templates;
  async.mapLimit(companyDataList,2,createCompanyInteraction,function(err,results) {
    callback(err,companyDataList)
  })
}
module.exports = createInteractions;