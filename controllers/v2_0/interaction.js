'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Interaction = mongoose.model('Interaction'),
  Activity = mongoose.model('Activity'),
  Poll = mongoose.model('Poll'),
  Question = mongoose.model('Question'),
  QuestionComment = mongoose.model('QuestionComment'),
  ActivityTemplate= mongoose.model('ActivityTemplate');
var log = require('../../services/error_log.js'),
    auth = require('../../services/auth.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    tools = require('../../tools/tools.js'),
    async = require('async');
var interactionTypes = ['activity','poll','question'];
var perPageNum = 10;
var createActivity = function (data) {
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
  return activity;
}
var createPoll = function (data) {
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
  return poll;
}
var createQuestion= function (data) {
  var question = new Question({
    theme: data.theme,
    content: data.content,
    endTime: data.endTime
  });
  return question;
}
module.exports = function (app) {

  return {
    createInteractionValidate: function (req, res, next) {
      var locationValidator = function(name, value, callback) {
        if(!value) return callback(true);
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
        type: {
          name: 'targetType',
          value: req.body.type,
          validators: [donlerValidator.enum([1, 2, 3],"互动类型错误"), 'required']
        },
        targetType: {
          name: 'targetType',
          value: req.body.targetType,
          validators: [donlerValidator.enum([1, 2, 3],"目标类型错误"), 'required']
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
          validators: interactionType==='activity' ? ['required','date',donlerValidator.after(req.body.startTime)] : ['required','date']
        },
        startTime: {
          name: 'startTime',
          value: req.body.startTime,
          validators: interactionType==='activity' ? ['required','date',donlerValidator.after(new Date())] : ['date']
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
          validators: ['date',donlerValidator.before(req.body.endTime),donlerValidator.after(new Date())]
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
              if(!req.user.isTeamMember(target))
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
    createInteraction: function (req, res) {
      var data = req.body;
      var interactionType = data.type;
      var interaction = new Interaction({
        cid: req.user.cid,
        targetType: data.targetType,
        target: data.target,
        poster: {
          _id:req.user._id
        }
      });
      var interactionContent;
      switch(interactionType) {
        case 'activity':
          interaction.type = 1;
          interactionContent = createActivity(data);
          break;
        case 'poll':
          interaction.type = 2;
          interactionContent = createPoll(data);
          break;
        case 'question':
          interaction.type = 3;
          interactionContent = createQuestion(data);
          break;
        default:
          return res.status(400).send({msg:"互动类型错误"});
      }
      async.parallel([
        function(callback){
          interactionContent.save(callback);
        },
        function(callback){
          interaction[interactionType] = interactionContent._id;
          interaction.save(callback)
        }
      ],
      // optional callback
      function(err, results){
        if(err) {
          log(err);
          res.status(500).send({msg:"服务器发生错误"});
        }
        else{
          res.send({interactionId:interaction.id});
        }
      });
    },
    createActivityTemplate: function (req, res) {
      var data = req.body;
      var activityTemplate = new ActivityTemplate({
        theme: data.theme,
        content:data.content,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        activityMold: data.activityMold
      });
      activityTemplate.save(function (error) {
        if(error) {
          res.status(500).send({msg:error});
        }
        else {
          res.send(activityTemplate);
        }

      })
    },
    getInteraction: function (req, res) {
      var interactionType = req.query.interactionType;
      var populateType;
      var userId = req.query.userId || req.user._id;
      var option ={cid:req.user.cid, "$or":[{"type":1,target:userId},{"type":2,target:{"$in":req.user.getTids()}},{"type":3,target:req.user.cid}]};
      if(req.query.createTime) {
        option.createTime ={"$lt":req.query.createTime}
      }
      var _perPageNum = req.query.limit || perPageNum;
      switch(interactionType) {
        case 'activity':
          option.type =1;
          populateType = interactionType;
          break;
        case 'poll':
          option.type =2;
          populateType = interactionType;
          break;
        case 'question':
          option.type =3;
          populateType = interactionType;
          break;
        default:
          populateType = 'activity poll question';
      }
      Interaction.find(option)
      .populate(populateType)
      .sort({ createTime: -1 })
      .limit(_perPageNum)
      .exec()
      .then(function (interactions) {
        return res.send(interactions);
      })
      .then(null,function (error) {
        log(error);
        res.status(500).send({msg:"服务器发生错误"});
      });
    },
    getInteractionDetail: function (req, res) {
      var interactionType = req.params.interactionType;
      if(interactionTypes.indexOf(interactionType)===-1)
         return res.status(400).send({msg:"互动类型错误"});
      Interaction.findById(req.params.interactionId)
        .populate(interactionType)
        .exec()
        .then(function (interaction) {
          return res.send(interaction);
        })
        .then(null,function (error) {
          log(error);
          res.status(500).send({msg:"服务器发生错误"});
        });
    },
    poll: {
      poll: function (req, res) {
        Interaction.findById(req.params.interactionId)
          .populate("poll")
          .exec()
          .then(function (interaction) {
            var index = tools.arrayObjectIndexOf(interaction.poll.option, req.body.index, 'index');
            if(interaction.poll.option[index].voters.indexOf(req.params.userId)>-1){
              return res.status(400).send({msg:"您已经进行了投票"})
            }
            interaction.poll.option[index].voters.push(req.params.userId);
            interaction.member.push(req.params.userId);
            async.parallel([
              function(callback){
                interaction.save(callback)
              },
              function(callback){
                interaction.poll.save(callback)
              }
            ],
            // optional callback
            function(err, results){
              if(!err){
                return res.send(interaction);
              }
              else{
                log(err)
                return res.status(500).send({msg:"服务器发生错误"});
              }
            });
          })
          .then(null,function (error) {
            log(error);
            res.status(500).send({msg:"服务器发生错误"});
          });
      }
    },
    question: {
      comment: function (req, res) {
        var userId = req.user._id;
        if(req.params.userId.toString()!==userId.toString()){
          return res.status(403).send({msg:"您没有权限进行回答和点赞"})
        }
        Interaction.findById(req.params.interactionId)
          .exec()
          .then(function (interaction) {
            if(interaction.cid.toString()!==req.user.cid.toString()){
              return res.status(403).send({msg:"您没有权限进行回答和点赞"})
            }
            var questionComment = new QuestionComment({
              type: req.body.type,
              questionId: interaction._id,
              postCid: interaction.cid,
              postId: userId
            })
            if(req.body.type===1){
              questionComment.content = req.body.content;
            }
            async.parallel([
              function(callback){
                questionComment.save(callback)
              },
              function(callback){
                interaction.member.push(userId);
                interaction.save(callback)
              }
            ],
            // optional callback
            function(err, results){
              if(!err){
                return res.send(questionComment);
              }
              else{
                log(err)
                return res.status(500).send({msg:"服务器发生错误"});
              }
            });
          })
          .then(null,function (error) {
            log(error);
            res.status(500).send({msg:"服务器发生错误"});
          });
      },
      adopt: function (req, res) {
        var userId = req.user._id;
        if(req.params.userId.toString()!==userId.toString()){
          return res.status(403).send({msg:"您没有权限采纳回答"})
        }
        async.waterfall([
          function(callback){
            QuestionComment.findById(req.body.commentId)
              .exec()
              .then(function(questionComment){
                if(questionComment)
                  callback(null)
              })
              .then(null,callback);
          },
          function(callback){
            Interaction.findById(req.params.interactionId)
              .populate('question')
              .exec()
              .then(function (interaction) {
                if(interaction.cid.toString()!==req.user.cid.toString() || interaction.poster._id.toString()!==userId.toString()){
                  callback(403)
                }
                else if(interaction.question.select){
                  callback(400)
                }
                else{
                  callback(null, interaction);
                }
              })
              .then(null,callback);
          },
          
          function(interaction, callback){
            interaction.question.select = req.body.commentId;
            interaction.question.save(function(error){
              callback(error,interaction);
            })
          }
        ],
        // optional callback
        function(err, results){
          console.log(err)
          // return res.status(403).send({msg:"您没有权限采纳回答"})
          if(!err){
            return res.send(results);
          }
          else{
            log(err)
            return res.status(500).send({msg:"服务器发生错误"});
          }
        });
        
      }
    }
  };
};



