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
var createQuestionComment =function(interaction, approveCount, callback) {
  var _comment = {
    interactionId: interaction._id,
    posterCid: interaction.cid,
    posterId: interaction.poster._id,
    content: chance.string({length:10}),
    approveCount: approveCount
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
      var i = 0;
      var comments = [];
      async.whilst(
        function() {return i<5},
        function(cb) {
          createActivityComment(model.activities[0],function(err, comment) {
            comments.push(comment);
            i++;
            cb(err);
          });
        },
        function(err) {
          parallelCallback(err, comments);
        }
      )
    },
    polls: function(parallelCallback){
      var i = 0;
      var comments = [];
      async.whilst(
        function() {return i<5},
        function(cb) {
          createPollComment(model.polls[0],function(err, comment) {
            comments.push(comment);
            i++;
            cb(err);
          });
        },
        function(err) {
          parallelCallback(err, comments);
        }
      )
    },
    questions: function(parallelCallback) {
      var comments = [];
      //生成多少评论
      var commentNum = 5;
      //前多少个评论点赞
      var appoveNum = 4;
      async.series([
        function(seriesCallback){
          var i = 0;
          async.whilst(
            function() {return i<commentNum},
            function(cb) {
              createQuestionComment(model.questions[0],i < appoveNum ? 1 : 0, function(err, comment) {
                comments.push(comment);
                i++;
                cb(err);
              });
            },
            function(err) {
              seriesCallback(err, comments);
            }
          )
        },
        function(seriesCallback){
          var i = 0;
          var questionApproves = [];
          async.whilst(
            function() {return i<appoveNum},
            function(cb) {
              createQuestionApprove(comments[i],function(err, comment) {
                questionApproves.push(comment);
                i++;
                cb(err);
              });
            },
            function(err) {
              seriesCallback(err, questionApproves);
            }
          )
        },
        function(seriesCallback){
          var i = 0;
          var answerComments = [];
          async.whilst(
            function() {return i<5},
            function(cb) {
              createAnswerComment(comments[i],function(err, comment) {
                answerComments.push(comment);
                i++;
                cb(err);
              });
            },
            function(err) {
              seriesCallback(err, answerComments);
            }
          )
        }
      ],parallelCallback);
    }
  },
  function(err, results) {
    model.activityComments = results.activities;
    model.pollComments = results.polls;
    model.questionComments = results.questions[0];
    model.questionApproves = results.questions[1];
    model.answerComments = results.questions[2];
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