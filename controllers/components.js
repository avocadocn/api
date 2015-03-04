'use strict';

var mongoose = require('mongoose');
var auth = require('../services/auth.js');
var message = require('../controllers/message.js');
var log = require('../services/error_log.js');
var Campaign = mongoose.model('Campaign');
var CompanyGroup = mongoose.model('CompanyGroup');
var donlerValidator = require('../services/donler_validator.js');
/**
 * 发送比分请求、接受比分的站内信
 * @param  {Object} req        request
 * @param  {Object} scoreBoard mongoose.model('ScoreBoard')
 * @param  {Object} leaderTeam 队长所在的队
 * @param  {Number} status     2：提出请求，3：确认比分
 * @param  {Object} opponentTid 对手小队id
 */
var sendScoreBoardMessage = function (req, scoreBoard, leaderTeam, status, opponentTid) {
  // 假定如果是用户账号即为队长（之前的权限判断过滤掉没有权限的用户），不发站内信给公司账号
  if (req.user.provider === 'user') {
    var team = {
      _id: leaderTeam.tid,
      name: leaderTeam.name,
      logo: leaderTeam.logo,
      status: status
    };
    if (scoreBoard.host_type === 'campaign') {
      Campaign.findById(scoreBoard.host_id).exec()
      .then(function (campaign) {
        if (!campaign) {
          log('not found campaign with id:', scoreBoard.host_id);
        } else {

          CompanyGroup.findById(opponentTid).exec()
          .then(function (companyGroup) {
            if (!companyGroup) {
              log('not found company_group with id:', opponentTid);
            } else {
              // 向每个队长发送站内信，resultConfirm第二个参数需要res对象，但这不安全，故设为null。
              // 前面已经有res.send，禁止其它函数对res对象进行操作
              // 实际上，该函数也没有使用res对象
              // 该函数内部是一系列异步操作，成功与否此处无法获知
              companyGroup.leader.forEach(function (leader) {
                message.resultConfirm(req, null, leader._id, team, campaign._id, campaign.theme);
              });
            }
          })
          .then(null, function (err) {
            log(err);
          });
        }
      })
      .then(null, function (err) {
        if (err) {
          log(err);
        }
      });
    }
  }

};
var winScore =3;
var tieScore = 1;
var loseScore = 0;
var addTeamScore = function (scoreBoard) {
  CompanyGroup.find({'_id':{'$in':scoreBoard.owner.teams}}).exec(function(err,teams){
    if(err){
      log(err);
      return;
    }
    teams.forEach(function(team, index){
      var _index=0;
      if(scoreBoard.playing_teams[0].tid.toString()!==team._id.toString()){
        _index =1;
      }
      switch(scoreBoard.playing_teams[_index].result) {
        case 1:
          team.score_rank.score+=winScore;
          break;
        case 0:
          team.score_rank.score+=tieScore;
          break;
        case -1:
          team.score_rank.score+=loseScore;
          break;
      }
      team.save(function (err) {
        if(err){
          log(err)
        }
      })
    });
    
  });
}
module.exports = function (app) {

  return {
    ScoreBoard : {
      setScoreValidate: function (req, res, next) {
        donlerValidator({
          data: {
            name: 'data',
            value: req.body.data,
            validators: ['required']
          }
        }, 'fast', function (pass, msg) {
          if (pass) {
            next();
          } else {
            var resMsg = donlerValidator.combineMsg(msg);
            return res.status(400).send({ msg: resMsg });
          }
        });
      },
      setScore: function (req, res) {
        if(!mongoose.Types.ObjectId.isValid(req.params.componentId)){
          return res.status(400).send({ msg: '参数错误' });
        }
        mongoose.model('ScoreBoard').findById(req.params.componentId).exec()
          .then(function (scoreBoard) {
            if (!scoreBoard) {
              res.status(404).send({msg: '找不到该组件' });
            } else {
              Campaign
              .findById(scoreBoard.host_id)
              .exec()
              .then(function (campaign) {
                if (!campaign) {
                  return res.status(404).send({ msg: '未找到活动'})
                }
                else if (!campaign.active) {
                  return res.status(400).send({ msg: '活动已经关闭'})
                }
                else if(campaign.start_time> Date.now()){
                  return res.status(400).send({msg:'活动还未开始，无法设置比分'})
                }
                else{

                  var leaderTeam;
                  var opponentTid;
                  var allows = [];
                  scoreBoard.playing_teams.forEach(function (playing_team) {
                    var role = auth.getRole(req.user, {
                      companies: [playing_team.cid],
                      teams: [playing_team.tid]
                    });
                    var allow = auth.auth(role, ['setScoreBoardScore']);
                    allows.push(allow.setScoreBoardScore);
                    if (req.user.provider === 'user') {
                      var isLeader = req.user.isTeamLeader(playing_team.tid);
                      if (isLeader) {
                        leaderTeam = playing_team;
                      } else {
                        opponentTid = playing_team.tid;
                      }
                    }
                  });
                  var denyAll = true;
                  for (var i = 0; i < allows.length; i++) {
                    if (allows[i]) {
                      denyAll = false;
                      break;
                    }
                  }
                  if (denyAll) {
                    return res.status(403).send({msg:'没有此权限'});
                  }

                  if (req.body.isInit) {
                    var err = scoreBoard.initScore(allows, req.body.data);
                  } else {
                    var err = scoreBoard.resetScore(allows, req.body.data);
                  }
                  if (err) {
                    return res.status(500).send({msg: err });
                  }

                  scoreBoard.save(function (err) {
                    if (err) {
                      log(err);
                      return res.status(500).send({msg: err });
                    } else {
                      if(scoreBoard.status==2){
                        addTeamScore(scoreBoard);
                      }
                      return res.sendStatus(200);
                    }
                  });

                  // 发站内信，如果用户同时是两个小队的队长，则不发送站内信
                  if (opponentTid) {
                    sendScoreBoardMessage(req, scoreBoard, leaderTeam, 2, opponentTid);
                  }
                }
              })
              .then(null, function (err) {
                console.log(err);
                return res.status(500).send({ msg: '服务器错误'});
              });
            }
          })
          .then(null, function (err) {
            log(err);
            return res.status(500).send({msg: err });
          });
      },

      confirmScore: function (req, res) {
        if(!mongoose.Types.ObjectId.isValid(req.params.componentId)){
          return res.status(400).send({ msg: '参数错误' });
        }
        mongoose.model('ScoreBoard').findById(req.params.componentId).exec()
          .then(function (scoreBoard) {
            if (!scoreBoard) {
              return res.status(404).send({msg: '找不到该组件' });
            }
            else if (scoreBoard.status === 0) {
              return res.status(400).send({msg: '比分没有设置。' });
            }
            else if (scoreBoard.status === 2) {
              return res.status(400).send({msg: '比分已确认。' });
            }
            else {
              Campaign
              .findById(scoreBoard.host_id)
              .exec()
              .then(function (campaign) {
                if (!campaign) {
                  return  res.status(404).send({ msg: '未找到活动'})
                }
                else if (!campaign.active) {
                  return res.status(400).send({ msg: '活动已经关闭'})
                }
                else if(campaign.start_time> Date.now()){
                  return res.status(400).send({msg:'活动还未开始，无法设置比分'})
                }
                else{
                  var leaderTeam;
                  var opponentTid;

                  var confirmIndex = [];
                  for (var i = 0; i < scoreBoard.playing_teams.length; i++) {
                    var playing_team = scoreBoard.playing_teams[i];
                    var role = auth.getRole(req.user, {
                      companies: [playing_team.cid],
                      teams: [playing_team.tid]
                    });
                    var allow = auth.auth(role, ['confirmScoreBoardScore']);
                    //当有未确认比分的队伍时加入到数值中去操作
                    if (allow.confirmScoreBoardScore&&!playing_team.confirm) {
                      confirmIndex.push(i);
                    }
                    if (req.user.provider === 'user') {
                      var isLeader = req.user.isTeamLeader(playing_team.tid);
                      if (isLeader) {
                        leaderTeam = playing_team;
                      } else {
                        opponentTid = playing_team.tid;
                      }
                    }
                  }
                  //如果一个都没有说明没有权限，目前只有两个队，所以如果有权限则数组中有一个
                  if(confirmIndex.length==0){
                    return res.status(403).send({msg: '没有确认该比分的权限' });
                  }
                  scoreBoard.confirm(confirmIndex);
                  scoreBoard.save(function (err) {
                    if (err) {
                      return res.status(500).send({msg: err });
                    } else {
                      res.sendStatus(200);
                    }
                  });
                  // 发站内信
                  if (opponentTid) {
                    sendScoreBoardMessage(req, scoreBoard, leaderTeam, 3, opponentTid);
                  }
                }
              });
            }
          })
          .then(null, function (err) {
            return res.status(500).send({msg: err });
          });
      },

      getLogs: function (req, res) {
        if(!mongoose.Types.ObjectId.isValid(req.params.componentId)){
          return res.status(400).send({ msg: '参数错误' });
        }
        mongoose.model('ScoreBoard')
        .findById(req.params.componentId)
        .exec()
        .then(function (scoreBoard) {
          if (!scoreBoard) {
            return res.status(404).send({msg: '找不到该组件' });
          } else {
            var cids =[];
            scoreBoard.playing_teams.forEach(function(playing_team, index){
              cids.push(playing_team.cid);
            });
            var role = auth.getRole(req.user, {
              companies: cids
            });
            var allow = auth.auth(role, ['getScoreBoardScore']);
            if(!allow.getScoreBoardScore) {
              return res.status(403).send({msg: '没有此权限' });
            }
            var logs = scoreBoard.getLogs();
            return res.status(200).send(logs);
          }
        })
        .then(null, function (err) {
          return res.status(500).send({msg: err });
        });
      }

    }
  }
}