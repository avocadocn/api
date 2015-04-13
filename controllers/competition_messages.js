'use strict';

var mongoose = require('mongoose');

var CompetitionMessage = mongoose.model('CompetitionMessage'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Vote = mongoose.model('Vote');
var moment = require('moment');
var donlerValidator = require('../services/donler_validator.js'),
    socketClient = require('../services/socketClient'),
    log = require('../services/error_log.js'),
    chatsBusiness = require('../business/chats');
var perPageNum = 10;
var dealCompetitionTime = 7;//7天
var sponsorCompetitionTime = 7;//7天
var formatCompetitionStatus = function (message) {
  moment.locale('zh-cn');
  var status={
    status: message.status,
    statusText: ''
  };
  switch(message.status) {
    case 'sent':
      var limitTime = moment(message.create_time);
      limitTime = limitTime.add(dealCompetitionTime, 'day');
      var now = moment();
      var diff = limitTime.diff(now);
      if(diff>0){
        status.statusText =moment.duration(diff).humanize();
      }
      else{
        status.status = 'deal_timeout';
        status.change = true;
      }
      break;
    case 'accepted':
      var limitTime = moment(message.deal_time);
      limitTime = limitTime.add(sponsorCompetitionTime, 'day');
      var now = moment();
      var diff = limitTime.diff(now);
      if(diff>0){
        status.statusText =moment.duration(diff).humanize();
      }
      else{
        status.status = 'competion_timeout';
        status.change = true;
      }
      break;
    default:
  }
  return status;
}
module.exports = function (app) {
  
  return {
    //验证前端来的数据是否符合要求 用户发挑战信
    sendMessageValidate: function (req, res, next) {
      //验证两个队是不是一个类型或者一个公司
      var teamsValidator = function(name, value, callback) {
        if(value[0]===value[1]) return callback(false, '挑战小队数据错误'); //自己队不能给自己队发
        CompanyGroup.find({'_id':{'$in':value}},{'gid':1, 'cid':1, 'leader':1, 'name':1, 'logo':1, 'cname':1},function(err, teams) {
          if(err||teams.length<2) {
            callback(false, '挑战小队数据错误');
          }
          else {
            req.teams = teams;//给下面保存cid和找队长用的= -.
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
          else{
            CompetitionMessage.count({sponsor_team:req.body.sponsor,opposite_team:req.body.opposite,status:{"$in":['sent', 'accepted']}},function (err, count) {
              if (err) log(err);
              if(count>0){
                return res.status(400).send({ msg: '您上次发送给该小队的挑战信还未结束，无法再次发送'});
              }else{
                next();
              }
            })
          } 
        }
        else {
          var resMsg = donlerValidator.combineMsg(msg);
          return res.status(422).send({ msg: resMsg });
        }
      })
    },
    //创建新挑战信
    createMessage : function (req, res) {
      var sponsor = req.teams[0]._id.toString() === req.body.sponsor ? req.teams[0]:req.teams[1];
      var opposite = req.teams[0]._id.toString() === req.body.sponsor ? req.teams[1]:req.teams[0];
      var message = new CompetitionMessage({
        sponsor_team: req.body.sponsor,
        sponsor_cid: sponsor.cid,
        opposite_team: req.body.opposite,
        opposite_cid: opposite.cid,
        competition_type: req.body.type,
        content: req.body.content,
        campaign_mold: sponsor.group_type,
        opposite_unread: true
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
            chatsBusiness.createChat({
              chatroomId: message.sponsor_team,
              chatType: 3,
              competitionMessageId:message._id,
              randomId: Math.floor(Math.random()*100),
              posterTeam: sponsor,
              competition_type: message.competition_type,
              opponent_team: opposite,
            });
            chatsBusiness.createChat({
              chatroomId: message.opposite_team,
              chatType: 4,
              competitionMessageId:message._id,
              randomId:  Math.floor(Math.random()*100),
              posterTeam: opposite,
              competition_type: message.competition_type,
              opponent_team: sponsor
            });
            res.status(200).send({msg: '挑战信发送成功'});
            //发给对方队长
            if(req.teams[0].leader && req.teams[0].leader[0]._id.toString() === req.user._id.toString()) {
              if(req.teams[1].leader.length>0) {
                socketClient.pushMessage(req.teams[1].leader[0]._id);
              }
            }
            else {
              if(req.teams[0].leader.length>0) {
                socketClient.pushMessage(req.teams[0].leader[0]._id);
              }
            }
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
        var page = req.query.page > 0? req.query.page:1;
        CompetitionMessage.paginate(req.options, page, perPageNum, function(err, pageCount, results, itemCount) {
          if(err){
            log(err);
            res.status(500).send({msg:err});
          }
          else{
            var unReadStatus = false;
            // var _results = [];
            results.forEach(function (result) {
              var isSponsorLeader = req.user.isTeamLeader(result.sponsor_team._id);
              var isOppsiteLeader =req.user.isTeamLeader(result.opposite_team._id);
              var unread =  isSponsorLeader && result.sponsor_unread || isOppsiteLeader && result.opposite_unread;
              unReadStatus = unReadStatus || unread;
              result.set('unread',unread,{strict:false});
              result.set('isSponsor',!isOppsiteLeader && req.user.isTeamMember(result.sponsor_team._id),{strict:false});
            })
            return res.send({'messages':results,'maxPage':pageCount,unReadStatus:unReadStatus});
          }
        },{populate:[{'path':'sponsor_team', 'select':{name:1, logo:1}}, {'path':'opposite_team', 'select':{name:1, logo:1}}],sortBy:{'create_time':-1}});
      }
    },
    //获取某条message
    getMessage:  function (req, res) {
      if(req.user.provider==='company') {
        return res.status(403).send({msg:'权限错误'});
      }
      CompetitionMessage.findOne({_id: req.params.messageId})
      .populate([{'path':'sponsor_team', 'select':{name:1, logo:1, group_type:1}}, {'path':'opposite_team', 'select':{name:1, logo:1, group_type:1}}])
      .populate('vote',{'units':1})
      .exec()
      .then(function(message) {
        var result = {
          // message: message,
          sponsorLeader:req.user.isTeamLeader(message.sponsor_team._id),
          oppositeLeader:req.user.isTeamLeader(message.opposite_team._id),
          sponsor: req.user.isTeamMember(message.sponsor_team._id),
          opposite: req.user.isTeamMember(message.opposite_team._id)
        }
        if(result.sponsorLeader && message.sponsor_unread || result.oppositeLeader && message.opposite_unread) {
          if(result.sponsorLeader) {
            message.sponsor_unread = false;
          }
          if(result.oppositeLeader) {
            message.opposite_unread = false;
          }
          message.save(function (err) {
            if(err) log(err);
          })
        }
        var status = formatCompetitionStatus(message);
        if(status.change) {
          message.status = status.status;
          message.save(function (err) {
            if(err){
              log(err)
            }
          })
        }
        var messagObject = message.toObject();
        messagObject.status_text =status.statusText;
        result.message = messagObject;
        if(result.sponsor || result.opposite)
          return res.status(200).send(result);
        else
          return res.status(403).send({msg:'权限错误'});
      })
      .then(null,function(err) {
        log(err);
        return res.status(500).send({msg: '查询错误'});
      });
    },
    //验证他能否接受/拒绝挑战
    dealValidate: function (req, res ,next) {
      CompetitionMessage
      .findOne({_id:req.params.messageId})
      .populate([{'path':'sponsor_team', 'select':{name:1, logo:1}}, {'path':'opposite_team', 'select':{name:1, logo:1}}])
      .exec()
      .then(function(message) {
        if(!message) {
          return res.status(500).send({msg: '查找失败'});
        }
        else {
          if(req.user.provider==='user' && req.user.isTeamLeader(message.opposite_team._id)) {
            if(message.status!=='sent')
              return res.status(400).send({msg: '此挑战信已处理过，无法继续处理。'});
            req.message = message;
            next();
          }
          else
            return res.status(403).send({msg: '权限错误'});
        }
      })
      .then(null,function(err) {
        log(err);
        return res.status(500).send({msg: '查询错误'});
      });;
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
          if(req.body.action==='accept') {
            chatsBusiness.createChat({
              chatroomId: req.message.opposite_team._id,
              chatType: 5,
              competitionMessageId:req.message._id,
              posterTeam: req.message.opposite_team,
              competition_type: req.message.competition_type,
              opponent_team: req.message.sponsor_team
            });
            chatsBusiness.createChat({
              chatroomId: req.message.sponsor_team._id,
              chatType: 6,
              competitionMessageId:req.message._id,
              posterTeam: req.message.sponsor_team,
              competition_type: req.message.competition_type,
              opponent_team: req.message.opposite_team
            });
          }
          return res.status(200).send({msg:'处理成功'});
        }
      })
    }
  };
};