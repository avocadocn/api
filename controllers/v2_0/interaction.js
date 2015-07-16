'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Interaction = mongoose.model('Interaction'),
  Activity = mongoose.model('Activity'),
  Poll = mongoose.model('Poll'),
  Question = mongoose.model('Question'),
  CompanyGroup = mongoose.model('CompanyGroup');

var log = require('../../services/error_log.js'),
    auth = require('../../services/auth.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    async = require('async');
module.exports = function (app) {

  return {
    postInteractionValidate: function (req, res, next) {
      var locationValidator = function(name, value, callback) {
        if(!value.name) return callback(false,"没有地址")
        if(value.coordinate && (!value.coordinate instanceof Array || value.coordinate.length !=2 || typeof value.coordinate[0] !=="number" || typeof value.coordinate[1] !=="number")) return callback(false,"坐标格式错误");
        return callback(true);
      };
      var interactionType;
      switch(req.url) {
        case '/interaction/poll':
          interactionType = "poll";
          break;
        case '/interaction/question':
          interactionType = "question";
          break;
        default:
          interactionType = "activity";
      }
      donlerValidator({
        targetType: {
          name: 'targetType',
          value: req.body.targetType,
          validators: [donlerValidator.enum([1, 2, 3]), 'required']
        },
        target: {
          name: 'target',
          value: req.body.target,
          validators: ['required', 'objectId']
        },
        theme: {
          name: 'theme',
          value: req.body.theme,
          validators: ['required']
        },
        content: {
          name: 'content',
          value: req.body.content,
          validators: ['required']
        },
        endTime: {
          name: 'endTime',
          value: req.body.endTime,
          validators: ['date']
        },
        startTime: {
          name: 'startTime',
          value: req.body.startTime,
          validators: interactionType==='activity' ? ['required','date'] : ['date']
        },
        memberMin:{
          name: 'memberMin',
          value: req.body.memberMin,
          validators: ['number']
        },
        memberMax: {
          name: 'memberMax',
          value: req.body.memberMax,
          validators: ['number']
        },
        location:{
          name: 'location',
          value: req.body.location,
          validators: interactionType==='activity' ? ['required',locationValidator] : []
        },
        deadline: {
          name: 'deadline',
          value: req.body.deadline,
          validators: ['date']
        },
        activityMold: {
          name: 'activityMold',
          value: req.body.activityMold,
          validators: interactionType==='activity' ? ['required'] :[]
        },
        option: {
          name: 'option',
          value: req.body.option,
          validators: interactionType==='poll' ? ['required',donlerValidator.minLength(2)] :[]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          var targetType = req.body.targetType;
          var target = req.body.target;
          switch(targetType) {
            case 3:
              if(req.user.cid.toString()!==target)
                return res.status(403).send({ msg: "您不能与其他公司进行互动" });
              break;
            case 2:
              if(!req.user.isTeamMembe(target))
                return res.status(403).send({ msg: "您不能与未参加的群组进行互动" });
              break;
            default:

          }
          next();
        } else {
          return res.status(400).send({ msg: donlerValidator.combineMsg(msg) });
        }
      });
    },
    postActivity: function (req, res) {
      var data = req.body;
      var interaction = new Interaction({
        cid: req.user.cid,
        type: 1,
        targetType: data.targetType,
        target: data.target,
        poster: req.user._id,
      });
      var activity = new Activity({
        theme: data.theme,
        content: data.content,
        memberMin: data.memberMin,
        memberMax: data.memberMax,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        deadline: data.deadline,
        activityMold: data.activityMold
      });
      async.series([
        function(callback){
          activity.save(callback);
        },
        function(callback){
          interaction.activity = activity._id;
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
        cid: req.user.cid,
        type: 2,
        targetType: data.targetType,
        target: data.target,
        poster: req.user._id,
      });
      var poll = new Poll({
        theme: data.theme,
        content: data.content,
        endTime: data.endTime,
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
          interaction.poll = poll._id;
          interaction.save(callback)
        }
      ],
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
        cid: req.user.cid,
        type: 3,
        targetType: data.targetType,
        target: data.target,
        poster: req.user._id,
      });
      var question = new Question({
        theme: data.theme,
        content: data.content,
        endTime: data.endTime
      });
      async.series([
        function(callback){
          question.save(callback);
        },
        function(callback){
          interaction.question = question._id;
          interaction.save(callback)
        }
      ],
      function(err, results){
          if(err) {
            res.status(500).send({msg:"服务器发送错误"});
          }
          else{
            res.send({interactionId:interaction.id});
          }
      });
    },
    getInteraction: function (req, res) {
      Interaction.find({cid:req.user.cid}).populate('activity poll question').exec().then(function (interactions) {
        return res.send(interactions);
      }).then(null,function (error) {
        res.status(500).send({msg:"服务器发送错误"});
      });
      
    },
    getActivity: function (req, res) {
      Interaction.find({cid:req.user.cid,type:1})
        .populate('activity')
        .exec().then(function (interactions) {
        return res.send(interactions);
      }).then(null,function (error) {
        res.status(500).send({msg:"服务器发送错误"});
      });
    },
    getPoll: function (req, res) {
      Interaction.find({cid:req.user.cid,type:2})
        .populate('poll')
        .exec().then(function (interactions) {
        return res.send(interactions);
      }).then(null,function (error) {
        res.status(500).send({msg:"服务器发送错误"});
      });
    },
    getQuestion: function (req, res) {
      Interaction.find({cid:req.user.cid,type:3})
        .populate('question')
        .exec().then(function (interactions) {
        return res.send(interactions);
      }).then(null,function (error) {
        res.status(500).send({msg:"服务器发送错误"});
      });
    },
    getActivitytDetail: function (req, res) {
      Interaction.findById(req.params.interactionId)
        .populate('activity')
        .exec().
        then(function (interaction) {
          return res.send(interaction);
        }).then(null,function (error) {
          res.status(500).send({msg:"服务器发送错误"});
        });
    },
    getPollDetail: function (req, res) {
      Interaction.findById(req.params.interactionId)
        .populate('poll')
        .exec().
        then(function (interaction) {
          return res.send(interaction);
        }).then(null,function (error) {
          res.status(500).send({msg:"服务器发送错误"});
        });
    },
    getQuestionDetail: function (req, res) {
      Interaction.findById(req.params.interactionId)
        .populate('question')
        .exec().
        then(function (interaction) {
          return res.send(interaction);
        }).then(null,function (error) {
          res.status(500).send({msg:"服务器发送错误"});
        });
    }
  };
};



