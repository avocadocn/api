'use strict';

var mongoose = require('mongoose');
var CompetitionMessage = mongoose.model('CompetitionMessage'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Vote = mongoose.model('Vote');
var donlerValidator = require('../services/donler_validator.js'),
    log = require('../services/error_log.js');

module.exports = function (app) {
  
  return {
    //验证前端来的数据是否符合要求 用户发挑战信
    sendMessageValidate: function (req, res, next) {
      //验证两个队是不是一个类型或者一个公司
      var teamsValidator = function(name, value, callback) {
        if(value[0]===value[1]) callback(false, '挑战小队数据错误'); //自己队不能给自己队发
        CompanyGroup.find({'_id':{'$in':value}},{'gid':1, 'cid':1},function(err, teams) {
          if(err||teams.length<2) {
            callback(false, '挑战小队数据错误');
          }
          else {
            req.teams = teams;//给下面保存cid用的= -.
            if(teams[0].gid===teams[1].gid || teams[0].cid.toString()===teams[1].cid.toString())
              callback(true);
            else
              callback(false, '挑战小队数据错误');
          }
        });
      };
      //数据验证
      donlerValidator({
        sponsor: {
          name: '挑战方',
          value: req.body.sponsor,
          validators: ['required']
        },
        opposite_team: {
          name: '被挑战方',
          value: req.body.opposite,
          validators: ['required']
        },
        competition_type: {
          name: '挑战类型',
          value: req.body.type,
          validators: ['required', 'number']
        },
        content: {
          name: '挑战词',
          value: req.body.content,
          validators: ['required']
        },
        teams: {
          name: '挑战类型',
          value: [req.body.sponsor, req.body.opposite],
          validators: [teamsValidator]
        }
      }, 'complete', function (pass, msg) {
        if(pass) {
          //权限验证
          if(req.user.provider!=='user' || !req.user.isTeamLeader(req.body.sponsor)) {
            return res.status(403).send({ msg: '权限错误'});
          }
          else next();
        }
        else {
          var resMsg = donlerValidator.combineMsg(msg);
          return res.status(422).send({ msg: resMsg });
        }
      })
    },
    //创建新挑战信
    createMessage : function (req, res) {
      var message = new CompetitionMessage({
        sponsor_team: req.body.sponsor,
        sponsor_cid: req.teams[0]._id.toString() === req.body.sponsor ? req.teams[0].cid:req.teams[1].cid,
        opposite_team: req.body.opposite,
        opposite_cid: req.teams[0]._id.toString() === req.body.sponsor ? req.teams[1].cid:req.teams[0].cid,
        competition_type: req.body.type,
        content: req.body.content
      });
      Vote.establish(message, function (err, vote) {
        if (err) {
          log(err);
          return res.status(500).send({msg: '保存出错'});
        }
        else {
          message.vote = vote._id;
          message.save(function(err) {
            if(err) {
              log(err);
              return res.status(500).send({msg: '保存出错'});
            }
            return res.status(200).send({msg: '挑战信发送成功'});
          });
        }
      });
      
    },

    //获取 个人/小队，发出/收到 的挑战日志
    getMessages: {
      filter: function (req, res, next) {
        var options = {};
        if(req.user.provider==='company') {
          //以后可以有获取全公司的
          return res.status(403).send({msg:'权限错误'});
        }
        //有此参数则代表看小队发出的
        else if(req.query.sponsor) {
          if(!req.user.isTeamMember(req.query.sponsor)) {
            return res.status(403).send({msg:'权限错误'});
          }
          options.sponsor_team = req.query.sponsor;
        }
        //有此参数则代表看小队收到的
        else if(req.query.opposite) {
          if(!req.user.isTeamMember(req.query.opposite)) {
            return res.status(403).send({msg:'权限错误'});
          }
          options.opposite_team = req.query.opposite;
        }
        //否则就代表是看个人的
        else {
          var teamIds = [];
          var length = req.user.team.length;
          for(var i=0; i<length; i++) {
            teamIds.push(req.user.team[i]);
          }
          if(req.query.messageType === 'receive'){
            options.opposite_team = {'$in':teamIds};
          }
          else if(req.query.messageType === 'sponsor') {
            options.sponsor_team = {'$in':teamIds};
          } else {
            return res.status(422).send({msg:'参数错误'});
          }
        }
        req.options = options;
        next();
      },
      queryAndFormat : function (req, res) {
        CompetitionMessage.find(req.options)
        .sort('-create_time')
        .populate([{'path':'sponsor_team', 'select':{name:1, logo:1}}, {'path':'opposite_team', 'select':{name:1, logo:1}}])
        .exec()
        .then(function(messages) {
          return res.status(200).send({messages: messages});
        })
        .then(null,function(err) {
          log(err);
          return res.status(500).send({msg: '查询错误'});
        });
      }
    },
    //验证他能否接受/拒绝挑战
    dealValidate: function (req, res ,next) {
      CompetitionMessage.findOne({_id:req.params.messageId}, function(err, message) {
        if(err||!message) {
          return res.status(500).send({msg: '查找失败'});
        }
        else {
          if(req.user.provider==='user' && req.user.isTeamLeader(message.opposite_team)) {
            if(message.status!=='sent')
              return res.status(400).send({msg: '此挑战信已处理过，无法继续处理。'});
            req.message = message;
            next();
          }
          else
            return res.status(403).send({msg: '权限错误'});
        }
      });
    },
    //接受/拒绝挑战
    dealCompetition: function (req, res) {
      if(req.body.action==='accept') {
        req.message.status = 'accepted';
      }
      else {
        req.message.status = 'rejected';
      }
      req.message.deal_time = new Date();
      req.message.save(function(err) {
        if(err) {
          log(err);
          return res.status(500).send({msg:'保存失败'});
        }else {
          return res.status(200).send({msg:'处理成功'});
        }
      })
    }
  };
};