'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Interaction = mongoose.model('Interaction'),
  Activity = mongoose.model('Activity'),
  Poll = mongoose.model('Poll'),
  Question = mongoose.model('Question'),
  QuestionComment = mongoose.model('QuestionComment'),
  ActivityTemplate= mongoose.model('ActivityTemplate'),
  PollTemplate= mongoose.model('PollTemplate'),
  QuestionTemplate= mongoose.model('QuestionTemplate');
var log = require('../../services/error_log.js'),
    auth = require('../../services/auth.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    tools = require('../../tools/tools.js'),
    async = require('async');
var interactionTypes = ['activity','poll','question'];
var perPageNum = 10;
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
var createQuestion= function (data,template) {
  var question = new Question();
  return question;
}
module.exports = function (app) {

  return {
    interaction: {
      createInteractionValidate: function (req, res, next) {
        var locationValidator = function(name, value, callback) {
          if(!value) return callback(true);
          if(!value.name) return callback(false,"没有地址")
          if(value.coordinate && (!value.coordinate instanceof Array || value.coordinate.length !=2 || typeof value.coordinate[0] !=="number" || typeof value.coordinate[1] !=="number")) return callback(false,"坐标格式错误");
          return callback(true);
        };
        var interactionType =req.body.type;
        donlerValidator({
          type: {
            name: '互动类型',
            value: interactionType,
            validators: ['required', donlerValidator.enum([1, 2, 3, 4],"互动类型错误")]
          },
          targetType: {
            name: '目标类型',
            value: req.body.targetType,
            validators: [donlerValidator.enum([1, 2, 3],"目标类型错误"), 'required']
          },
          target: {
            name: '目标ID',
            value: req.body.target,
            validators: ['required', 'objectId']
          },
          templateId: {
            name: '模板ID',
            value: req.body.templateId,
            validators: ['objectId']
          },
          theme: {
            name: '主题',
            value: req.body.theme,
            validators: !req.body.templateId ? ['required'] :[]
          },
          content: {
            name: '内容',
            value: req.body.content,
            validators: !req.body.templateId ? ['required'] :[]
          },
          endTime: {
            name: '结束时间',
            value: req.body.endTime,
            validators: !req.body.templateId ? ['required','date',donlerValidator.after(req.body.startTime)] : ['date']
          },
          tags: {
            name: '标签',
            value: req.body.tags,
            validators: ['array']
          },
          startTime: {
            name: '开始时间',
            value: req.body.startTime,
            validators: interactionType===1 && !req.body.templateId ? ['required','date',donlerValidator.after(new Date())] : ['date']
          },
          memberMin:{
            name: '最小人数',
            value: req.body.memberMin,
            validators: ['number']
          },
          memberMax: {
            name: '最大人数',
            value: req.body.memberMax,
            validators: ['number']
          },
          location:{
            name: '地点',
            value: req.body.location,
            validators: interactionType===1 && !req.body.templateId ? ['required',locationValidator] : []
          },
          deadline: {
            name: '截止时间',
            value: req.body.deadline,
            validators: ['date',donlerValidator.before(req.body.endTime),donlerValidator.after(new Date())]
          },
          activityMold: {
            name: '活动类型',
            value: req.body.activityMold,
            validators: interactionType===1 && !req.body.templateId ? ['required'] :[]
          },
          option: {
            name: '选项',
            value: req.body.option,
            validators: interactionType===2 && !req.body.templateId ? ['required',donlerValidator.minLength(2)] :[]
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
        var interactionType;
        var templateModel;
        switch(data.type) {
          case 1:
            interactionType = "activity";
            templateModel = "ActivityTemplate";
            break;
          case 2:
            interactionType = "poll";
            templateModel = "PollTemplate";
            break;
          case 3:
            interactionType = "question";
            templateModel = "QuestionTemplate";
            break;
          default:
            return res.status(400).send({msg:"互动类型错误"});
        }
        var interaction = new Interaction({
          cid: req.user.cid,
          targetType: data.targetType,
          target: data.target,
          poster: {
            _id:req.user._id
          },
          type: data.type,
          theme: data.theme,
          content: data.content,
          endTime: data.endTime,
          tags: data.tags
        });
        
        async.waterfall([
          function(callback){
            
            if(req.body.templateId) {
              mongoose.model(templateModel).findById(req.body.templateId)
              .exec()
              .then(function(template){
                if(template) {
                  if(!data.theme) {
                    interaction.theme =template.theme;
                  }
                  if(!data.content) {
                    interaction.content =template.content;
                  }
                  if(!data.endTime) {
                    interaction.endTime =template.endTime;
                  }
                  if(!data.tags) {
                    interaction.tags =template.tags;
                  }
                  callback(null,template)
                }
                else {
                  callback(400)
                }
              })
              .then(null, callback)
            }
            else {
              callback(null,null)
            }
          },
          function(template, callback){
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
            interactionContent.save(function (error) {
              callback(error,interactionContent._id)
            });
          },
          function(id,callback){
            interaction[interactionType] = id;
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
      getInteraction: function (req, res) {
        var interactionType = req.query.interactionType;
        var populateType;
        var userId = req.query.userId || req.user._id;
        var option ={cid:req.user.cid, "$or":[{"targetType":1,target:userId},{"targetType":2,target:{"$in":req.user.getTids()}},{"targetType":3,target:req.user.cid}]};
        if(req.query.createTime) {
          option.createTime ={"$lt":req.query.createTime}
        }
        var _perPageNum = req.query.limit || perPageNum;
        switch(interactionType) {
          case 1:
            option.type =1;
            populateType = interactionType;
            break;
          case 2:
            option.type =2;
            populateType = interactionType;
            break;
          case 3:
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
        if(interactionType<1 || interactionType>interactionTypes.length)
           return res.status(400).send({msg:"互动类型错误"});
        Interaction.findById(req.params.interactionId)
          .populate(interactionTypes[interactionType-1])
          .exec()
          .then(function (interaction) {
            return res.send(interaction);
          })
          .then(null,function (error) {
            log(error);
            res.status(500).send({msg:"服务器发生错误"});
          });
      }
    },
    activity: {
      join: function (req, res) {
        // body...
      },
      quit: function (req, res) {
        // body...
      }
    },
    poll: {
      poll: function (req, res) {
        var userId = req.params.userId;
        Interaction.findById(req.params.interactionId)
          .populate("poll")
          .exec()
          .then(function (interaction) {
            var index = tools.arrayObjectIndexOf(interaction.poll.option, req.body.index, 'index');
            if(interaction.member.indexOf(userId)>-1){
              return res.status(400).send({msg:"您已经进行了投票"})
            }
            interaction.poll.option[index].voters.push(userId);
            interaction.member.push(userId);
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
        if(!mongoose.Types.ObjectId.isValid(req.params.interactionId) || req.body.commentId && !mongoose.Types.ObjectId.isValid(req.body.commentId)){
          return res.status(400).send({msg:"数据格式错误"})
        }
        async.waterfall([
          function(callback){
            if(req.body.commentId) {
              QuestionComment.findById(req.body.commentId)
                .exec()
                .then(function (comment) {
                  callback(comment? null:400)
                })
                .then(null,function (error) {
                  callback(500)
                });
            }
            else {
              callback(null)
            }
          },
          function(callback){
            Interaction.findById(req.params.interactionId)
              .exec()
              .then(function (interaction) {
                if(interaction.cid.toString()!==req.user.cid.toString()){
                  return callback(403)
                }
                else {
                  callback(null,interaction)
                }
              })
              .then(null,function (error) {
                callback(500)
              });
          },
          function(interaction, callback){
            var questionComment = new QuestionComment({
              type: req.body.type,
              questionId: interaction._id,
              postCid: interaction.cid,
              postId: userId
            })
            if(req.body.commentId) {
               questionComment.commentId = req.body.commentId;
            }
            if(req.body.type===1){
              questionComment.content = req.body.content;
            }
            questionComment.save(function (error) {
              callback(error,interaction,questionComment)
            })
          },
          function(interaction, questionComment, callback){
            if(interaction.member.indexOf(userId)===-1) {
              interaction.member.push(userId);
              interaction.save(function (error) {
                callback(error,questionComment)
              })
            }
            else {
              callback(null,questionComment);
            }
          }
        ],
        // optional callback
        function(err, results){
          if(!err){
            return res.send(results);
          }
          else{
            log(err)
            if(err===403) {
               return res.status(403).send({msg:"您没有权限采纳回答"})
            }
            else if(err===400) {
              return res.status(400).send({msg:"您提交的参数错误"});
            }
            else {
              return res.status(500).send({msg:"服务器发生错误"});
            }
          }
        });
        
      },
      adopt: function (req, res) {
        var userId = req.user._id;
        async.waterfall([
          function(callback){
            if (!mongoose.Types.ObjectId.isValid(req.body.commentId)) {
              return callback(400)
            }
            QuestionComment.findById(req.body.commentId)
              .exec()
              .then(function(questionComment){
                if(questionComment)
                  callback(null)
                else {
                  callback(400)
                }
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
                else if(!interaction.question || interaction.question.select){
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
          if(!err){
            return res.send(results);
          }
          else{
            log(err)
            if(err===403) {
               return res.status(403).send({msg:"您没有权限采纳回答"})
            }
            else if(err===400) {
              return res.status(400).send({msg:"您提交的参数错误"});
            }
            else {
              return res.status(500).send({msg:"服务器发生错误"});
            }
            
          }
        });
      },
      getComments: function (req, res) {
        var option ={questionId:req.params.interactionId};
        if(req.query.createTime) {
          option.createTime ={"$lt":req.query.createTime}
        }
        if(req.query.commentId) {
          option.commentId = req.query.commentId
        }
        else {
          option.commentId ={"$exists":false}
        }
        var _perPageNum = req.query.limit || perPageNum;
        QuestionComment.find(option)
        .sort({ createTime: -1 })
        .limit(_perPageNum)
        .exec()
        .then(function (comments) {
          return res.send(comments);
        })
        .then(null,function (error) {
          log(error);
          res.status(500).send({msg:"服务器发生错误"});
        });
      }
    },
    template: {
      createTemplateValidate: function (req, res, next) {
        var locationValidator = function(name, value, callback) {
          if(!value) return callback(true);
          if(!value.name) return callback(false,"没有地址")
          if(value.coordinate && (!value.coordinate instanceof Array || value.coordinate.length !=2 || typeof value.coordinate[0] !=="number" || typeof value.coordinate[1] !=="number")) return callback(false,"坐标格式错误");
          return callback(true);
        };
        var templateType = req.body.templateType;
        donlerValidator({
          templateType: {
            name: '模板类型',
            value: templateType,
            validators: ['required',, donlerValidator.enum([1, 2, 3],"模板类型错误")]
          },
          theme: {
            name: '主题',
            value: req.body.theme,
            validators: ['required']
          },
          content: {
            name: '内容',
            value: req.body.content,
            validators: ['required']
          },
          endTime: {
            name: '结束时间',
            value: req.body.endTime,
            validators: ['required','date',donlerValidator.after(req.body.startTime)]
          },
          startTime: {
            name: '开始时间',
            value: req.body.startTime,
            validators: templateType=== 1 ? ['required','date',donlerValidator.after(new Date())] : ['date']
          },
          memberMin:{
            name: '最小人数',
            value: req.body.memberMin,
            validators: ['number']
          },
          memberMax: {
            name: '最大人数',
            value: req.body.memberMax,
            validators: ['number']
          },
          location:{
            name: '地点',
            value: req.body.location,
            validators: templateType=== 1 ? ['required',locationValidator] : []
          },
          deadline: {
            name: '截止时间',
            value: req.body.deadline,
            validators: ['date',donlerValidator.before(req.body.endTime),donlerValidator.after(new Date())]
          },
          activityMold: {
            name: '活动类型',
            value: req.body.activityMold,
            validators: templateType=== 1 ? ['required'] :[]
          },
          option: {
            name: '选项',
            value: req.body.option,
            validators: templateType=== 2 ? ['required',donlerValidator.minLength(2)] :[]
          }
        }, 'fast', function (pass, msg) {
          if (pass) {
            next();
          } else {
            return res.status(400).send({ msg: donlerValidator.combineMsg(msg) });
          }
        });
      },
      getTemplateList: function (req, res) {
        var option,templateModel;
        switch(req.query.templateType) {
          case '1':
            templateModel = "ActivityTemplate";
            break;
          case '2':
            templateModel = "PollTemplate";
            break;
          case '3':
            templateModel = "QuestionTemplate";
            break;
          default:
            return res.status(400).send({msg:"互动类型错误"});
        }
        if(req.query.createTime) {
          option.createTime ={"$lt":req.query.createTime}
        }
        var _perPageNum = req.query.limit || perPageNum;
        mongoose.mode(templateModel).find(option)
        .sort({ createTime: -1 })
        .limit(_perPageNum)
        .exec()
        .then(function (templates) {
          return res.send(templates);
        })
        .then(null,function (error) {
          log(error);
          return res.status(500).send({msg:"服务器发生错误"});
        });
      },
      createTemplate: function (req, res) {
        var data = req.body;
        var template;
        switch(req.body.templateType) {
          case 1:
            template = new ActivityTemplate({
              theme: data.theme,
              content: data.content,
              location: data.location,
              startTime: data.startTime,
              endTime: data.endTime,
              activityMold: data.activityMold,
              memberMin: data.memberMin,
              memberMax: data.memberMax,
              deadline: data.deadline,
              tags:data.tags
            });
            break;
          case 2:
            template = new PollTemplate({
              theme: data.theme,
              content: data.content,
              endTime: data.endTime,
            });
            var option =[];
            console.log(data.option)
            data.option.forEach(function(_option, index){
              console.log(_option, index)
              option.push({
                index:index,
                value:_option
              })
            });
            template.option = option;
            break;
          case 3:
            template = new QuestionTemplate({
              theme: data.theme,
              content: data.content,
              endTime: data.endTime
            });
            break;
        }
        template.save(function (error) {
          if(error) {
            return res.status(500).send({msg:error});
          }
          else {
            return res.send(template);
          }
        })
      },
      getTemplateDetail: function (req, res) {
        if (!mongoose.Types.ObjectId.isValid(req.params.templateId)) {
          return res.status(400).send({msg:"数据格式错误"});
        }
        var option,templateModel;
        switch(req.params.templateType) {
          case '1':
            templateModel = "ActivityTemplate";
            break;
          case '2':
            templateModel = "PollTemplate";
            break;
          case '3':
            templateModel = "QuestionTemplate";
            break;
          default:
            return res.status(400).send({msg:"互动类型错误"});
        }
        mongoose.model(templateModel).findById(req.params.templateId)
          .exec()
          .then(function (template) {
            return res.send(template);
          })
          .then(null,function (error) {
            log(error);
            return res.status(500).send({msg:"服务器发生错误"});
          });
      }
    }
  };
};



