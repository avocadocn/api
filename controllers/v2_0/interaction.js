'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Interaction = mongoose.model('Interaction'),
  Activity = mongoose.model('Activity'),
  Poll = mongoose.model('Poll'),
  Question = mongoose.model('Question'),
  CompanyGroup = mongoose.model('CompanyGroup');

var log = require('../../services/error_log.js');
var async = require('async');
module.exports = function (app) {

  return {

    postActivity: function (req, res) {
      var data = req.body;
      var interaction = new Interaction({
        cid: data.cid,
        type: 1,
        target_type: data.target_type,
        target: data.target,
        poster: req.user._id,
      });
      var activity = new Activity({
        theme: data.theme,
        content: data.content,
        member_min: data.member_min,
        member_max: data.member_max,
        location: data.location,
        start_time: data.start_time,
        end_time: data.end_time,
        deadline: data.deadline,
        activity_mold: data.activity_mold
      });
      async.series([
        function(callback){
          activity.save(callback);
        },
        function(callback){
          interaction.content = activity._id;
          interaction.save(callback)
        }
      ],
      // optional callback
      function(err, results){
          if(err) {
            res.status(500).send({msg:"服务器发送错误"});
          }
          else{
            res.send({interactionId:interaction.id});
          }
      });
    },
    postPoll: function (req, res) {
      var data = req.body;
      var interaction = new Interaction({
        cid: data.cid,
        type: 2,
        target_type: data.target_type,
        target: data.target,
        poster: req.user._id,
      });
      var poll = new Poll({
        theme: data.theme,
        content: data.content,
        end_time: data.end_time,
      });
      var option = [];
      data.option.forEach(function(_option, index){
        option.push({
          index:index,
          value:_option
        })
      });
      poll.option = option;
      async.series([
        function(callback){
          poll.save(callback);
        },
        function(callback){
          interaction.content = poll._id;
          interaction.save(callback)
        }
      ],
      // optional callback
      function(err, results){
          if(err) {
            res.status(500).send({msg:"服务器发送错误"});
          }
          else{
            res.send({interactionId:interaction.id});
          }
      });
    },
    postQuestion: function (req, res) {
      var data = req.body;
      var interaction = new Interaction({
        cid: data.cid,
        type: 3,
        target_type: data.target_type,
        target: data.target,
        poster: req.user._id,
      });
      var question = new Question({
        theme: data.theme,
        content: data.content,
        end_time: data.end_time
      });
      async.series([
        function(callback){
          question.save(callback);
        },
        function(callback){
          interaction.content = question._id;
          interaction.save(callback)
        }
      ],
      // optional callback
      function(err, results){
          if(err) {
            res.status(500).send({msg:"服务器发送错误"});
          }
          else{
            res.send({interactionId:interaction.id});
          }
      });
    }
  };
};



