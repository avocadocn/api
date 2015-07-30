'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var Interaction  = mongoose.model('Interaction');
var ActivityComment  = mongoose.model('ActivityComment');
var PollComment = mongoose.model('PollComment');
var QuestionComment  = mongoose.model('QuestionComment');
var QuestionApprove  = mongoose.model('QuestionApprove');
var chance = require('chance').Chance();
var createActivityComment =function(interaction,callback) {
  var _comment = {
    interactionId: interaction._id,
    posterCid: interaction.cid,
    posterId: interaction.poster._id,
    content: chance.string({length:10})
  }
  ActivityComment.create(_comment, callback)
}
var createPollComment =function(interaction, callback) {
  var _comment = {
    interactionId: interaction._id,
    posterCid: interaction.cid,
    posterId: interaction.poster._id,
    content: chance.string({length:10})
  }
  PollComment.create(_comment, callback)
}
var createQuestionComment =function(interaction, callback) {
  var _comment = {
    interactionId: interaction._id,
    posterCid: interaction.cid,
    posterId: interaction.poster._id,
    content: chance.string({length:10})
  }
  QuestionComment.create(_comment, callback)
}
var createQuestionApprove = function(comment, callback) {
  var appove = {
    interactionId: comment.interactionId,
    commentId: comment._id,
    posterCid: comment.posterCid,
    posterId: comment.posterId,
  }
  QuestionApprove.create(appove, callback)
}
var createAnswerComment = function(comment, callback) {
  var answerComment = {
    interactionId: comment.interactionId,
    commentId: comment._id, 
    posterCid: comment.posterCid,
    posterId: comment.posterId,
    content: chance.string()
  }
  QuestionComment.create(answerComment, callback);
}
var createAllTypeComments = function(model,callback) {
  async.parallel({
    activities: function(parallelCallback){
      createActivityComment(model.activities[0],parallelCallback)
    },
    polls: function(parallelCallback){
      createPollComment(model.polls[0],parallelCallback)
    },
    questions: function(parallelCallback) {
      var comment;
      async.series([
        function(seriesCallback){
          createQuestionComment(model.questions[0],function(err,_comment){
            comment = _comment;
            seriesCallback(err, _comment)
          })
        },
        function(seriesCallback){
          createQuestionApprove(comment,seriesCallback)
        },
        function(seriesCallback){
          createAnswerComment(comment,seriesCallback);
        }
      ],parallelCallback);
    }
  },
  function(err, results) {
    model.activityComment = results.activities;
    model.pollComment = results.polls;
    model.questionComment = results.questions[0];
    model.questionApprove = results.questions[1];
    model.answerComment = results.questions[2];
    callback(err)
  });
}
var createInteractionComments = function(companyData, callback) {
  if(!companyData.model.status.mail_active) {
    return callback(null);
  }
  async.parallel({
    //创建公司互动评论
    companyInteractions: function(parallelCallback){
      createAllTypeComments(companyData,parallelCallback)
    },
    //创建小队互动评论
    teamInteractions: function(parallelCallback){
      async.mapLimit(companyData.teams,3,function(team,mapCallback){
        createAllTypeComments(team,mapCallback)
      },parallelCallback);
    }
  },
  function(err, results) {
    
    callback(err)
  });
}
module.exports = createInteractionComments;