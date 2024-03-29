'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Team = mongoose.model('Team'),
  Interaction = mongoose.model('Interaction'),
  Activity = mongoose.model('Activity'),
  Poll = mongoose.model('Poll'),
  Question = mongoose.model('Question'),
  QuestionComment = mongoose.model('QuestionComment'),
  ActivityTemplate= mongoose.model('ActivityTemplate'),
  PollTemplate= mongoose.model('PollTemplate'),
  QuestionTemplate= mongoose.model('QuestionTemplate'),
  QuestionApprove= mongoose.model('QuestionApprove');
var log = require('../../services/error_log.js'),
    auth = require('../../services/auth.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    pushService = require('../../services/push_service.js'),
    tools = require('../../tools/tools.js'),
    async = require('async'),
    notificationController = require('./notifications.js'),
    uploader = require('../../services/uploader.js'),
    multerService = require('../../middlewares/multerService.js');
var interactionTypes = ['activity','poll','question'];
var commentModelTypes = ['ActivityComment','PollComment','QuestionComment'];
var perPageNum = 10;
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
    deadline: data.deadline || data.endTime || template.deadline,
    activityMold: data.activityMold || template.activityMold,
    remindTime: data.remindTime
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
  if(data.option) {
    data.option.forEach(function(_option, index){
      option.push({
        index:index,
        value:_option
      })
    });
  }
  else {
    option = template.option;
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
var createQuestion= function (data,template) {
  var question = new Question();
  return question;
}

/**
 * 如果是公开的互动，更新个人互动时间戳
 * @param  {Object} user 
 */
var updateInteractionTime = function(user) {
  User.update({_id:user._id}, {$set: {interactionTime: new Date()}}, function(err) {
    if(err) {
      log(err);
    }
  });
};
module.exports = {
  interaction: {
    /**
     * 将form中的属性放到body中，将file解析
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    interactionFormFormat: function(req, res, next) {
      if(req.body.tags) {
        req.body.tags = tools.unique(req.body.tags);
      }
      req.body.type = parseInt(req.body.type);
      req.body.targetType = parseInt(req.body.targetType);
      if(req.body.location) {
        req.body.location = {
          "name": req.body.location
        }
        if(req.body.longitude){
          req.body.location.loc = {
            "coordinates" : [parseFloat(req.body.longitude),parseFloat(req.body.latitude)],
          }
        }
      }
      next();
    },
    /**
     * 发互动的验证（三种类型）
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    createInteractionValidate: function (req, res, next) {
      var locationValidator = function(name, value, callback) {
        if(!value) return callback(true);
        if(!value.name) return callback(false,"没有地址")
        if(value.loc && value.loc.coordinates && (!value.loc.coordinates instanceof Array || value.loc.coordinates.length !=2 || typeof value.loc.coordinates[0] !=="number" || typeof value.loc.coordinates[1] !=="number")) return callback(false,"坐标格式错误");
        return callback(true);
      };
      var interactionType =req.body.type;
      donlerValidator({
        type: {
          name: '互动类型',
          value: interactionType,
          validators: ['required', donlerValidator.enum([1, 2, 3],"互动类型错误")]
        },
        targetType: {
          name: '目标类型',
          value: req.body.targetType,
          validators: ['required', donlerValidator.enum([1, 2, 3],"目标类型错误")]
        },
        target: {
          name: '目标ID',
          value: req.body.target,
          validators: ['required', 'objectId']
        },
        relatedTeam: {
          name: '发起小队ID',
          value: req.body.relatedTeam,
          validators: ['objectId']
        },
        templateId: {
          name: '模板ID',
          value: req.body.templateId,
          validators: ['objectId']
        },
        inviters: {
          name: '邀请人',
          value: req.body.inviters,
          validators: ['array']
        },
        theme: {
          name: '主题',
          value: req.body.theme,
          validators: !req.body.templateId ? ['required'] :[]
        },
        // content: {
        //   name: '内容',
        //   value: req.body.content,
        //   validators: !req.body.templateId ? ['required'] :[]
        // },
        endTime: {
          name: '结束时间',
          value: req.body.endTime,
          validators: (!req.body.templateId &&interactionType===1) ? ['required','date',donlerValidator.after(req.body.startTime)] : ['date',donlerValidator.after(req.body.startTime)]
        },
        tags: {
          name: '标签',
          value: req.body.tags,
          validators: ['array']
        },
        startTime: {
          name: '开始时间',
          value: req.body.startTime,
          validators: (interactionType===1 && !req.body.templateId )? ['required','date',donlerValidator.after(new Date())] : ['date',donlerValidator.after(new Date())]
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
          name: '地址',
          value: req.body.location,
          validators: (interactionType===1 && !req.body.templateId )? ['required',locationValidator] : []
        },
        deadline: {
          name: '截止时间',
          value: req.body.deadline,
          validators: ['date',donlerValidator.notAfter(req.body.endTime),donlerValidator.after(new Date())]
        },
        remindTime: {
          name: '提醒时间',
          value: req.body.remindTime,
          validators: ['date',donlerValidator.notAfter(req.body.endTime),donlerValidator.after(new Date())]
        },
        // activityMold: {
        //   name: '活动类型',
        //   value: req.body.activityMold,
        //   validators: (interactionType===1 && !req.body.templateId) ? ['required'] :[]
        // },
        option: {
          name: '选项',
          value: req.body.option,
          validators: (interactionType===2 && !req.body.templateId) ? ['required','array', donlerValidator.minLength(2)] :[]
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          var targetType = req.body.targetType;
          var target = req.body.target;
          switch(targetType) {
            case 3:
              if(req.user.cid.toString()!==target)
                return res.status(403).send({ msg: "您不能与其他学校进行互动" });
              //TODO:将来应该限制只要认证的社团管理员或者校园大使可以面向全校发
              if(req.user.cid.toString()!==target)
                return res.status(403).send({ msg: "您不能与其他学校进行互动" });
              break;
            case 2:
              for (var i = req.user.team.length - 1; i >= 0; i--) {
                if(req.user.team[i]._id.toString()===target){
                  req.body.public = req.user.team[i].public;
                  break;
                }
              };
              if(i===-1)
                return res.status(403).send({ msg: "您不能与未参加的群组进行互动" });
              break;
            default:
          }
          if(req.files) {
            multerService.formatPhotos(req.files, {getSize:true}, function(err, files) {
              var photos = [];
              if(files && files.length) {
                files.forEach(function(img) {
                  var photo = {
                    uri: multerService.getRelPath(img.path),
                    width: img.size.width,
                    height: img.size.height
                  };
                  photos.push(photo);
                });
                req.body.photos = photos;
              }
              next();
            });
          }
          else {
            next();
          }
        } else {
          return res.status(400).send({ msg: donlerValidator.combineMsg(msg) });
        }
      });
    },
    createInteractionAuth:function(req, res, next) {
      //公司类型时需要验证身份1：如果为大使直接通过，如果不是需要验证是否为小队管理员，是否为认证小队
      if(req.body.targetType===3) {
        Team.findOne({_id:req.body.relatedTeam,cid:req.body.target}).exec()
        .then(function(team) {
          if(req.user.isSuperAdmin(req.body.target) || team && team.level===1 && team.isAdminOrLeader(req.user._id)) {
            req.body.offical = true;
          }
          next();
        })
        .then(null,function(err) {
          return req.status(500).send({msg:"数据发生错误"})
        })
      }
      else {
        next()
      }
    },
    /**
     * 创建互动
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
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
      //目前未区分poster的身份，均为user
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
        tags: data.tags,
        photos: data.photos,
        public: data.public ==undefined ? true : data.public,
        relatedTeam: data.relatedTeam,
        offical: !!data.offical,
        template: data.templateId
      });

      async.waterfall([
        function(callback){
          //邀请查看
          if(data.inviters) {
            User.find({cid:req.user.cid, _id:{"$in":data.inviters}})
            .exec()
            .then(function(users){
              var inviters = []
              users.forEach(function (user) {
                inviters.push(user._id);
              })
              interaction.inviters = inviters;
              callback(null)
            })
            .then(null, callback)
          }
          else {
            callback(null)
          }
        },
        function(callback){
          //模板
          if(data.templateId) {
            Interaction.findOne({template:data.templateId,target:data.target})
            .exec()
            .then(function(interaction){
              if(interaction) {
                callback(406)
              }
              else {
                callback(null)
              }
            })
            .then(null, callback)
          }
          else {
            callback(null)
          }
        },
        function(callback){
          //模板
          if(data.templateId) {
            mongoose.model(templateModel).findById(data.templateId)
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
            //活动
            case 1:
              interactionContent = createActivity(data,template);
              if(interactionContent.startTime<new Date())
                return callback("开始时间不能早于现在");
              if(interaction.endTime<new Date())
                return callback("结束时间不能早于现在");
              break;
            //投票
            case 2:
              interactionContent = createPoll(data,template);
              break;
            //求助
            case 3:
              interactionContent = createQuestion(data,template);
              break;
          }
          interactionContent.save(function (error) {
            callback(error,interactionContent._id)
            if(!error && data.templateId) {
              template.forwarding++;
              template.save(function(err){
                if(err) log(err)
              })
            }
          });
        },
        function(id,callback){
          interaction[interactionType] = id;
          interaction.save(callback)
        }
      ],
      function(err, results){
        if(err) {
          log(err);
          switch(err) {
            case 400:
              res.status(400).send({msg:"参数错误"});
              break;
            case 406:
              res.status(500).send({msg:"该互动已经存在，无法重复创建"});
              break;
            default:
              res.status(500).send({msg:"服务器发生错误"});
          }
        }
        else{
          res.send({interactionId:interaction.id});
          if(interaction.inviters.length>0) {
            notificationController.sendInteractionNfct(2, interaction, req.user._id, interaction.inviters);
          }
          if(interaction.public) {
            updateInteractionTime(req.user);
            pushService.concernPush(req.user);
          }
          if(interaction.type===1 && interaction.targetType === 2) {
            pushService.teamPush(interaction.target);
          }
        }
      });
    },
    /**
     * 获取互动列表，包括自己和其他人的,分三种类型,按照创建时间分页
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getInteraction: function (req, res) {
      // console.time("getInteraction")
      var interactionType = req.query.interactionType;
      var populateType;
      var userId = req.query.userId || req.user._id;
      var option;
      async.series([
        function (callback) {
          if(req.query.team) {//通过小队id获取该小队的互动
            option ={
              "cid":req.user.cid,
              "status":{"$lt":3},
              "targetType":2,
              "target":req.query.teamId
            }
            return  callback(null);
          }
          //自己
          if(userId==req.user._id) {
            //0：参加的活动，1:参加的小队的活动，2：认证小队活动和学校活动（面向全校发的互动），3：未认证小队活动,default:所以自己所在学校和参加的小队的
            switch(req.query.requestType) {
              case "0":
                option ={"status":{"$lt":3}, "cid":req.user.cid, "members": userId};
                break;
              case "1":
                option ={"cid":req.user.cid, "status":{"$lt":3},"targetType":2,"target":{"$in":req.user.getTids()}};
                break;
              case "2":
                option ={"status":{"$lt":3}, "offical":true, "targetType":3,"target":req.user.cid};
                break;
              case "3":
                option ={"status":{"$lt":3}, "offical": {$ne:true}, "targetType":3, "target":req.user.cid};
                break;
              case "4":
              default: 
                option ={"cid":req.user.cid, "status":{"$lt":3}, "$or":[{"targetType":2,"target":{"$in":req.user.getTids()}},{"targetType":3,"target":req.user.cid}]};
            }
            callback(null,req.user)
          }
          //其他人
          else {
            User.findOne({_id:userId}).exec()
            .then(function(user){
              if(!user)  {
                callback(400);
              }
              else if(user.cid.toString()!==req.user.cid.toString()){
                callback(403);
              }
              else {
                option = {
                  cid:req.user.cid,
                  status:{"$lt":3},
                  "$and":[
                    {"$or":[
                      {"members":userId},
                      {"poster._id":userId}
                    ]},
                    {"$or":[
                      {"public":true},
                      {
                        "$and":[
                          {"targetType":2},
                          {
                            "target":{
                              "$in":req.user.getTids(2)
                            }
                          }
                        ]}
                    ]}
                  ]
                };
                callback(null,user)
              }
            })
            .then(null,function (error) {
              log(error);
              callback(500);
            })
          }
        },
        function(callback){
          var _order = "-createTime";

          //分页
          if(req.query.createTime) {
            option.createTime ={"$lt":req.query.createTime}
          }
          var _perPageNum = req.query.limit || perPageNum;
          switch(interactionType) {
            //活动
            case '1':
              option.type =1;
              populateType = interactionTypes[0];
              //排序可以为开始时间倒序，结束时间倒序
              var orderOption = ["-startTime","-endTime"];
              if(orderOption.indexOf(req.query.order)>-1) {
                _order = req.query.order;
              }
              break;
            //投票
            case '2':
              option.type =2;
              populateType = interactionTypes[1];
              break;
            //求助
            case '3':
              option.type =3;
              populateType = interactionTypes[2];
              break;
            default:
              populateType = 'activity poll question';
          }
          Interaction.find(option)
          .populate(populateType)
          .sort(_order)
          .limit(_perPageNum)
          .exec()
          .then(function (interactions) {
            // console.timeEnd("getInteraction")
            callback(null, interactions);
          })
          .then(null,function (error) {
            log(error);
            callback(500);
          });
        }
      ],
      function(error,results){
        switch(error) {
          case undefined:
            return res.send(results[1])
            break;
          case 400:
            return res.status(400).send({msg:"您提交的参数错误"})
            break;
          case 403:
            return res.status(403).send({msg:"您没有权限获取该用户的互动列表"})
            break;
          default:
            return res.status(500).send({msg:"服务器发送错误"})
        }
      })
    },
    /**
     * 根据Id获取互动详情
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getInteractionDetail: function (req, res) {
      var interactionType = parseInt(req.params.interactionType);
      if(!interactionType || interactionType<1 || interactionType>interactionTypes.length)
         return res.status(400).send({msg:"互动类型错误"});
      Interaction.findOne({_id:req.params.interactionId,type:interactionType})
        .populate(interactionTypes[interactionType-1])
        .exec()
        .then(function (interaction) {
          if(!interaction){
            return res.status(400).send({msg:"参数错误"})
          }
          else if(interaction.public || interaction.targetType===2&&req.user.isTeamMember(interaction.target)) {
            return res.send(interaction);
          }
          else {
            return res.status(403).send({msg:"您没有权限获取该互动详情"})
          }
        })
        .then(null,function (error) {
          log(error);
          res.status(500).send({msg:"服务器发生错误"});
        });
    },
    /**
     * 发评论的验证
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    commentValidate: function (req, res, next) {
      donlerValidator({
        interactionType: {
          name: '互动类型',
          value: req.params.interactionType,
          validators: ['required', donlerValidator.enum(['1', '2', '3'],"互动类型错误")]
        },
        interactionId: {
          name: '互动Id',
          value: req.params.interactionId,
          validators: ['required', 'objectId']
        },
        content: {
          name: '内容',
          value: req.body.content,
          validators: ['required']
        },
        commentId: {
          name: '评论Id',
          value: req.body.commentId,
          validators: ['objectId']
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          return res.status(400).send({ msg: donlerValidator.combineMsg(msg) });
        }
      });
    },
    /**
     * 发评论,三种类型互动分别对应不同的model
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    comment: function (req, res) {
      var userId = req.user._id;
      var interactionType = parseInt(req.params.interactionType);
      var commentModel = commentModelTypes[interactionType-1];
      var targetComment;
      async.waterfall([
        function(callback) {
          //对评论的评论验证
          if(req.body.commentId && interactionType === 3) {
            mongoose.model(commentModel).findById(req.body.commentId)
              .exec()
              .then(function (comment) {
                targetComment = comment;
                callback(comment ? null: 400)
              })
              .then(null,function (error) {
                callback(error)
              });
          }
          else {
            callback(null)
          }
        },
        function(callback){
          Interaction.findOne({_id:req.params.interactionId, type: interactionType})
            .exec()
            .then(function (interaction) {
              if(!interaction) {
                callback(400)
              }
              else if(interaction.cid.toString()!==req.user.cid.toString()){
                return callback(403)
              }
              else {
                callback(null,interaction)
              }
            })
            .then(null,function (error) {
              callback(error)
            });
        },
        function(interaction, callback){
          var _comment = {
            interactionId: interaction._id,
            posterCid: interaction.cid,
            posterId: userId,
            content: req.body.content
          }
          //仅求助会有此参数
          if(req.body.commentId && interactionType === 3) {
            _comment.commentId = req.body.commentId;
            _comment.targetUser = targetComment.targetUser;
          }
          mongoose.model(commentModel).create(_comment, function (error,comment) {
            callback(error,interaction,comment)
          })
        },
        function(interaction, comment, callback){
          if(interactionType===3 && !req.body.commentId && interaction.members.indexOf(userId)===-1) {
            interaction.members.push(userId);
            interaction.save(function (error) {
              callback(error,comment)
            })
          }
          else {
            callback(null,comment);
          }
          if(interactionType === 3 && req.body.commentId) { //如果是评论回答 发通知
            notificationController.sendInteractionNfct(4, interaction, req.user._id, targetComment.posterId, comment);
          }
          else if(interactionType === 3 ) { //若是回答求助，发通知
            notificationController.sendInteractionNfct(1, interaction, req.user._id, interaction.poster._id);
            if(interaction.public) {
              updateInteractionTime(req.user);
              pushService.questionPush(interaction);
            }
          }
        }
      ],
      function(error, results){
        if(!error){
          return res.send(results);
        }
        else{
          if(error===403) {
             return res.status(403).send({msg:"您没有权限进行评论"})
          }
          else if(error===400) {
            return res.status(400).send({msg:"您提交的参数错误"});
          }
          else {
            log(error)
            return res.status(500).send({msg:"服务器发生错误"});
          }
        }
      });
    },
    /**
     * 获取评论列表，分三种类型,按照创建时间分页，当存在req.body.commentId时为针对互动的评论，否则为对评论的评论列表
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getComments: function (req, res) {
      var interactionType = parseInt(req.params.interactionType)
      if([1,2,3].indexOf(interactionType)===-1)
        return res.status(400).send({ msg: "参数错误" });
      Interaction.findById(req.params.interactionId).exec()
        .then(function(interaction) {
          if(!interaction)
            return res.status(400).send({msg:"参数错误"})
          if(req.user.cid.toString()!=interaction.cid.toString() || !interaction.public && interaction.targetType===2&&!req.user.isTeamMember(interaction.target))
            return res.status(403).send({msg:"您没有权限获取该互动评论"})
          var commentModel =commentModelTypes[interactionType-1];
          var option ={interactionId:req.params.interactionId, status: 1};
          if(req.query.createTime) {
            option.createTime ={"$lt":req.query.createTime}
          }
          //获取针对评论的评论
          if(req.query.commentId) {
            option.commentId = req.query.commentId
          }
          //求助获取的是直接的评论，而不获取对评论的评论
          else if(interactionType===3){
            option.commentId ={"$exists":false}
          }
          //对于活动和投票获取所有的评论，按时间排序
          var _perPageNum = req.query.limit || perPageNum;
          mongoose.model(commentModel).find(option)
          .sort({ createTime: -1 })
          .limit(_perPageNum)
          .exec()
          .then(function (comments) {
            return res.send(comments);
          })
          .then(null,function (error) {
            console.log(error);
            res.status(500).send({msg:"服务器发生错误"});
          });
        })
        .then(null,function(error){

        })
    },
    /**
     * 删除评论，设置status为2,针对该评论的评论status设置为3
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteComment: function (req, res) {
      var interactionType = parseInt(req.params.interactionType)
      if([1,2,3].indexOf(interactionType)===-1) {
        return res.status(400).send({ msg: "参数错误" });
      }
      var commentModel =commentModelTypes[interactionType-1];
      async.waterfall([
        function (callback) {
          var option ={_id: req.body.commentId, interactionId: req.params.interactionId, posterId: req.user._id, status: 1};
          var update ={$set:{status: 2}};
          mongoose.model(commentModel).findOneAndUpdate(option,update,{"new":true}, callback);
        },
        function (comment, callback) {
          if(!comment) {return callback(400);}
          var option ={commentId: req.body.commentId, status: 1};
          var update ={$set:{status: 3}};
          mongoose.model(commentModel).update(option,update,{ multi: true }, function (error, count) {
            callback(error,{comment: comment,subCount: count})
          });
        }
      ],
      function (error, results) {
        if(error) {
          switch(error) {
            case 400:
              return res.status(400).send({msg: "提交的参数错误"})
              break;
            default:
              return res.status(500).send({msg: "服务器发送错误"})
          }
        }
        else {
          return res.send(results)
        }
      });
    }
  },
  activity: {
    /**
     * 参加活动,判断如果以前退出过则删除掉quitMembers中信息，在Interaction和activity（有时间信息）中均存入member信息
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    join: function (req, res) {
      var userId = req.params.userId;
      Interaction.findById(req.params.interactionId)
        .populate("activity")
        .exec()
        .then(function (interaction) {
          if(!interaction|| !interaction.activity)
            return res.status(404).send({msg:"该活动不存在"})
          if(interaction.members.indexOf(userId)>-1){
            return res.status(400).send({msg:"您已经参加了该活动"})
          }
          if(interaction.activity.deadline<new Date()){
            return res.status(400).send({msg:"活动报名已经截止"})
          }
          if(req.user.cid.toString()!=interaction.cid.toString() || interaction.targetType===2&&!req.user.isTeamMember(interaction.target))
            return res.status(403).send({msg:"您没有权限参加该活动"})
          var quitMemberIndex = tools.arrayObjectIndexOf(interaction.activity.quitMembers,userId, '_id');
          quitMemberIndex > -1 && interaction.activity.quitMembers.splice(quitMemberIndex,1);
          var memberIndex = tools.arrayObjectIndexOf(interaction.activity.members,userId, '_id');
          memberIndex === -1 && interaction.activity.members.push({_id:userId});
          interaction.members.push(userId);
          async.parallel([
            function(callback){
              interaction.save(function (argument) {
                callback(argument)
              })
            },
            function(callback){
              interaction.activity.save(function (argument) {
                callback(argument)
              })
            }
          ],
          // optional callback
          function(err, results){
            if(!err){
              res.send(interaction);
              //给组织者发通知
              notificationController.sendInteractionNfct(1, interaction, req.user._id, interaction.poster._id);
              //如果是公开的，更新个人互动时间戳
              if(interaction.public) {
                updateInteractionTime(req.user);
              }
              return;
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
    /**
     * 退出活动，将信息加入quitMembers中，Interaction和activity（有时间信息）中member信息删除
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    quit: function (req, res) {
      var userId = req.params.userId;
      Interaction.findById(req.params.interactionId)
        .populate("activity")
        .exec()
        .then(function (interaction) {
          if(!interaction || !interaction.activity)
            return res.status(404).send({msg:"该活动不存在"})
          if(interaction.activity.deadline<new Date()){
            return res.status(400).send({msg:"活动报名已经截止,无法退出"})
          }
          var memberIndex = interaction.members.indexOf(userId);
          if(memberIndex===-1){
            return res.status(400).send({msg:"您还没有参加该活动"})
          }
          interaction.members.splice(memberIndex,1);
          var activityMemberIndex = tools.arrayObjectIndexOf(interaction.activity.members,userId, '_id');
          if(activityMemberIndex>-1){
            var member = interaction.activity.members.splice(activityMemberIndex,1);
            interaction.activity.quitMembers.push({
              _id: member[0]._id,
              createTime: member[0].createTime,
              updateTime: new Date()
            });
          }
          async.parallel([
            function(callback){
              interaction.save(callback)
            },
            function(callback){
              interaction.activity.save(callback)
            }
          ],
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
  poll: {
    /**
     * 投票，仅可以投一次，不可取消
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    poll: function (req, res) {
      var userId = req.params.userId;
      Interaction.findById(req.params.interactionId)
        .populate("poll")
        .exec()
        .then(function (interaction) {
          if(!interaction || !interaction.poll)
            return res.status(404).send({msg:"该投票不存在"})
          // if(interaction.endTime<new Date()){
          //   return res.status(400).send({msg:"投票已经截止"})
          // }
          if(req.user.cid.toString()!=interaction.cid.toString() || interaction.targetType===2&&!req.user.isTeamMember(interaction.target))
            return res.status(403).send({msg:"您没有权限进行投票"})
          if(interaction.members.indexOf(userId)>-1){
            return res.status(400).send({msg:"您已经进行了投票"})
          }
          var index = tools.arrayObjectIndexOf(interaction.poll.option, req.body.index, 'index');
          interaction.poll.option[index].voters.push(userId);
          interaction.members.push(userId);
          async.parallel([
            function(callback){
              interaction.save(callback)
            },
            function(callback){
              interaction.poll.save(callback)
            }
          ],
          function(err, results){
            if(!err){
              res.send(interaction);
              notificationController.sendInteractionNfct(1, interaction, req.user._id, interaction.poster._id);
              if(interaction.public) {
                updateInteractionTime(req.user);
              }
              return;
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
    /**
     * 采纳最佳答案
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
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
              if(questionComment && questionComment.interactionId.toString()===req.params.interactionId)
                callback(null, questionComment)
              else {
                callback(400)
              }
            })
            .then(null,callback);
        },
        function(questionComment, callback){
          Interaction.findById(req.params.interactionId)
            .populate('question')
            .exec()
            .then(function (interaction) {
              if(!interaction || !interaction.question || interaction.question.select){
                callback(400)
              }
              else if(interaction.cid.toString()!==req.user.cid.toString() || interaction.poster._id.toString()!==userId.toString()){
                callback(403)
              }
              else{
                callback(null, interaction);
                //发通知给被选中的回答者
                notificationController.sendInteractionNfct(3, interaction, req.user._id, questionComment.posterId);
              }
            })
            .then(null,callback);
        },
        function(interaction, callback){
          interaction.question.select = req.body.commentId;
          interaction.question.save(function(error){
            callback(error, interaction);
          })
        }
      ],

      function(err, interaction){
        if(!err){
          return res.send(interaction);
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
    /**
     * 点赞
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    approve: function (req, res) {
      var userId = req.user._id;
      async.waterfall([
        function(callback){
          //判断是否已经点过赞
          QuestionApprove.count({commentId:req.body.commentId,posterId:userId})
            .exec()
            .then(function(count){
              callback(count>0 ? 400 :null)
            })
            .then(null,callback);
        },
        function(callback){
          if (!mongoose.Types.ObjectId.isValid(req.body.commentId)) {
            return callback(400)
          }
          QuestionComment.findOne({status:1, _id:req.body.commentId, commentId:{"$exists":false}})
            .exec()
            .then(function(questionComment){
              if(questionComment)
                callback(null,questionComment)
              else {
                callback(400)
              }
            })
            .then(null,callback);
        },
        function(questionComment, callback){
          if (questionComment.posterCid.toString()!==req.user.cid.toString()) {
            return callback(403)
          }
          var questionApprove = new QuestionApprove({
            interactionId: req.params.interactionId,
            commentId: req.body.commentId,
            posterCid: req.user.cid,
            posterId: userId
          });
          questionApprove.save(function (error) {
            callback(error, questionApprove, questionComment)
          });
        },
        function(questionApprove, questionComment, callback){
          questionComment.approveCount++;
          questionComment.save(function (error) {
            callback(error,{questionApprove:questionApprove,questionComment:questionComment});
          });
        }
      ],
      function(err, results){
        if(!err){
          res.send(results);
          var tempInteraction = {_id: req.params.interactionId, type:3};
          notificationController.sendInteractionNfct(5, tempInteraction, req.user._id, results.questionComment.posterId, results.questionComment);
        }
        else{
          if(err===403) {
             return res.status(403).send({msg:"您没有权限点赞"})
          }
          else if(err===400) {
            return res.status(400).send({msg:"您提交的参数错误"});
          }
          else {
            log(err)
            return res.status(500).send({msg:"服务器发生错误"});
          }
        }
      });
    },
    /**
     * 取消点赞
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    cancelApprove: function (req, res) {
      var userId = req.user._id;
      async.waterfall([
        function(callback){
          //点过赞的删除，否则400
          QuestionApprove.findOne({
            // _id: req.body.approveId,
            // interactionId: req.params.interactionId,
            commentId: req.body.commentId,
            posterId:req.user._id
          }).exec()
          .then(function (questionApprove) {
            if(!questionApprove) {
              callback(400)
            }
            else {
              questionApprove.remove(callback)
            }
          })
          .then(null,callback)
        },
        function(questionApprove, callback){
          QuestionComment.findOne({_id:req.body.commentId, status:1, commentId:{"$exists":false}})
            .exec()
            .then(function(questionComment){
              if(questionComment && questionComment.approveCount>0) {
                questionComment.approveCount--;
                questionComment.save(function (error) {
                  callback(error,questionComment)
                })
              }
              else {
                callback(400)
              }
            })
            .then(null,callback);
        }
      ],
      function(err, results){
        if(!err){
          return res.send(results);
        }
        else{
          log(err)
          if(err===403) {
             return res.status(403).send({msg:"您没有权限取消该点赞"})
          }
          else if(err===400) {
            return res.status(400).send({msg:"您提交的参数错误"});
          }
          else {
            return res.status(500).send({msg:"服务器发生错误"});
          }
          
        }
      });
    }
  },
  template: {
    templateFormFormat:function(req, res, next) {
      req.body.templateType = parseInt(req.body.templateType);
      if(req.body.location) {
        req.body.location = {
          "name": req.body.location
        }
        if(req.body.longitude){
          req.body.location.loc = {
            "coordinates" : [parseFloat(req.body.longitude),parseFloat(req.body.latitude)],
          }
        }
      }
      if(req.body.option) {
        req.body.option = req.body.option.split(",")
      }
      if(req.body.tags) {
        req.body.tags = tools.unique(req.body.tags.split(","));
      }
      next();
    },
    /**
     * 发互动的模板的验证
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    createTemplateValidate: function (req, res, next) {
      var locationValidator = function(name, value, callback) {
        if(!value) return callback(true);
        if(!value.name) return callback(false,"没有地址")
        if(value.loc && value.loc.coordinates && (!value.loc.coordinates instanceof Array || value.loc.coordinates.length !=2 || typeof value.loc.coordinates[0] !=="number" || typeof value.loc.coordinates[1] !=="number")) return callback(false,"坐标格式错误");
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
        // content: {
        //   name: '内容',
        //   value: req.body.content,
        //   validators: ['required']
        // },
        endTime: {
          name: '结束时间',
          value: req.body.endTime,
          validators: [templateType=== 1 ?'required':undefined,'date',donlerValidator.after(req.body.startTime)]
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
        // activityMold: {
        //   name: '活动类型',
        //   value: req.body.activityMold,
        //   validators: templateType=== 1 ? ['required'] :[]
        // },
        option: {
          name: '选项',
          value: req.body.option,
          validators: templateType=== 2 ? ['required','array', donlerValidator.minLength(2)] :[]
        },
        tags: {
          name: '标签',
          value: req.body.tags,
          validators: ['array']
        },
      }, 'fast', function (pass, msg) {
        if (pass) {
          if(req.files) {
            multerService.formatPhotos(req.files, {getSize:true}, function(err, files) {
              var photos = [];
              if(files && files.length) {
                files.forEach(function(img) {
                  var photo = {
                    uri: multerService.getRelPath(img.path),
                    width: img.size.width,
                    height: img.size.height
                  };
                  photos.push(photo);
                });
                req.body.photos = photos;
              }
              next();
            });
          }
          else {
            next();
          }
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          return res.status(400).send({ msg: resMsg });
        }
      });
    },
    /**
     * 获取模板列表,分三种类型,按照创建时间分页
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getTemplateList: function (req, res) {
      var option ={
        active: {"$ne":false}
      };
      var templateModel;
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
      mongoose.model(templateModel).find(option)
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
    /**
     * 创建模板，三种类型
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
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
            tags:data.tags,
            photos: data.photos
          });
          break;
        case 2:
          template = new PollTemplate({
            theme: data.theme,
            content: data.content,
            endTime: data.endTime,
            tags:data.tags,
            photos: data.photos
          });
          var option =[];
          data.option.forEach(function(_option, index){
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
            endTime: data.endTime,
            tags:data.tags,
            photos: data.photos
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
    /**
     * 获取模板详情，根据templateId
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
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
    },
    getTemplatePublishStatus: function(req, res) {
      Interaction.find({cid:req.user.cid,template:req.params.templateId})
      .select("target")
      .exec()
      .then(function (interactions) {
        var targets = interactions.map(function(interaction) {
          return interaction.target.toString();
        })
        var teams = req.user.team.map(function(team) {
          var team = {
            _id:team._id,
            published:targets.indexOf(team._id.toString())>-1
          }
          return team;
        })
        var company = {
          _id:req.user.cid,
          published:targets.indexOf(req.user.cid.toString())>-1
        }
        return res.send({teams:teams,company:company});
      })
      .then(null,function (error) {
        log(error);
        return res.status(500).send({msg:"服务器发生错误"});
      });
    }
    
  }
};



