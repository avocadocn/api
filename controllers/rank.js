'use strict';

var path = require('path');

var mongoose = require('mongoose');
var Rank = mongoose.model('Rank'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup');
var async = require('async');
var log = require('../services/error_log.js'),
    donlerValidator = require('../services/donler_validator.js'),
    auth = require('../services/auth.js'),
    schedule = require('../services/schedule.js');
var timeLimit = 7 * 24 * 60 * 60 * 1000;
var forwardTeamNum = 2;
var backwardTeamNum = 2;
var rankTeamNum =5;
module.exports = function (app) {
  return {
    getRank: function (req, res) {
      donlerValidator({
        province: {
          name: '省份',
          value: req.query.province,
          validators: ['required']
        },
        city: {
          name: '城市',
          value: req.query.city,
          validators: ['required']
        },
        gid: {
          name: '小队类型',
          value: req.query.gid,
          validators: ['required']
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          var now = new Date();
          var option = {
            'city.province': unescape(req.query.province),
            'city.city':unescape(req.query.city),
            // 'rank_type':req.query.rankType,
            // 'create_date':{$gte:new Date(Date.now()-timeLimit)},
            'group_type._id':req.query.gid
          }
          Rank.find(option)
          .sort('-create_date')
          .limit(1)
          .exec()
          .then(function (ranks) {
            if (!ranks) {
              res.status(400).send({ msg: '没有找到对应的榜单' });
            } else {
              var cid = req.user.cid || req.user._id;
              var rank = ranks[0].toObject();
              rank.team.forEach(function(team) {
                var totalCompNum = team.lose + team.tie + team.win ;
                var odds_percent = team.win ? Math.floor(team.win/totalCompNum*100) :0;
                console.log(odds_percent);
                team.odds_percent = odds_percent;
              });
              CompanyGroup.find({active:true, cid: cid ,gid:req.query.gid},{cid: 1,name:1,logo:1,gid: 1,score:1,score_rank:1})
              .exec()
              .then(function (teams) {
                if (!teams) {
                  res.send({rank:rank});
                } else {
                  var formatTeams = [];
                  teams.forEach(function (team ) {
                    if(team.score_rank && team.score_rank.rank) {
                      var totalCompNum = team.score_rank.lose + team.score_rank.tie + team.score_rank.win ;
                      var odds_percent = team.score_rank.win ? Math.floor(team.score_rank.win/totalCompNum*100) :0;
                      formatTeams.push({
                        "_id":team._id,
                        "cid":team.cid,
                        "name":team.name,
                        "logo":team.logo,
                        "rank":team.score_rank.rank,
                        "odds_percent": odds_percent, 
                        "score":team.score_rank.score,//战绩积分
                        "activity_score":team.score.total //活跃度积分
                      });
                    }
                  });
                  res.send({rank:rank,team:formatTeams});
                }
              })
              .then(null, function (err) {
                log(err);
                res.send({rank:rank[0]});
              });
              
            }
          })
          .then(null, function (err) {
            log(err);
            res.sendStatus(500);
          });
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
      
    },
    getTeamRank: function (req, res) {
      var team = req.companyGroup;
      var role = auth.getRole(req.user, {
        companies:[team.cid]
      });
      var allow = auth.auth(role,['getTeamRank']);
      if(!allow.getTeamRank) {
        return res.status(403).send({msg: '权限错误'});
      }
      var option ={
        'city.province':unescape(team.city.province),
        'city.city':unescape(team.city.city),
        'gid':team.gid,
        'score_rank.rank':{
          '$lte' : team.score_rank.rank + backwardTeamNum,
          '$gte' : Math.max(team.score_rank.rank - forwardTeamNum, 1)
        }
      }
      CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1, cname:1})
      .sort('score_rank.rank')
      .limit(rankTeamNum)
      .exec()
      .then(function (teams) {
        if (!teams) {
          res.status(400).send({ msg: '没有找到对应的小队' });
        } else {
          res.send(teams)
        }
      })
      .then(null, function (err) {
        log(err);
        res.sendStatus(500);
      });
    },
    getCompanyRank: function (req, res) {
      CompanyGroup.find({cid:req.params.companyId,gid:{$ne:'0'}},{city: 1,gid: 1,score_rank:1})
      .sort('-score_rank.score -score.total')
      .exec()
      .then(function (teams) {
        if (!teams) {
          res.status(400).send({ msg: '没有找到对应的小队' });
        } else {
          async.map(teams, function(team, callback) {
            var option ={
              'city.province':unescape(team.city.province),
              'city.city':unescape(team.city.city),
              'gid':team.gid,
              'score_rank.rank':{
                '$lte' : team.score_rank.rank + backwardTeamNum,
                '$gte' : team.score_rank.rank - forwardTeamNum
              }
            }
            CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1,gid:1})
            .sort('score_rank.rank')
            .limit(rankTeamNum)
            .exec(callback);
          }, function(err,results){
              if( err ) {
                log(err)
                res.sendStatus(500);
              } else {
                res.send(results);
              }
          });
        }
      })
      .then(null, function (err) {
        log(err);
        res.sendStatus(500);
      });
    },
    getUserTeamRank: function (req, res) {
      CompanyGroup.find({'member._id':req.user._id,gid:{$ne:'0'}},{city: 1, gid:1,score: 1, score_rank:1,name: 1,logo: 1})
      .sort('-score_rank.score -score.total')
      .exec()
      .then(function (teams) {
        if (!teams) {
          res.status(400).send({ msg: '没有找到对应的小队' });
        } else {
          async.map(teams, function(team, callback) {
            var option ={
              'city.province':unescape(team.city.province),
              'city.city':unescape(team.city.city),
              'gid':team.gid,
              'score_rank.rank':{
                '$lte' : team.score_rank.rank + backwardTeamNum,
                '$gte' : team.score_rank.rank - forwardTeamNum
              }
            }
            CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1,gid:1})
            .sort('score_rank.rank')
            .limit(rankTeamNum)
            .exec(function (err, _team) {
              if(err){
                callbak(err);
              }
              else{
                callback(null,{list:_team,team:team})
              }
            });
          }, function(err,results){
              if( err ) {
                log(err)
                res.sendStatus(500);
              } else {
                res.send(results);
              }
          });
        }
      })
      .then(null, function (err) {
        log(err);
        res.sendStatus(500);
      });
    },
    update: function (req,res) {
      if(req.body.token=='55yali') {
        schedule.teamPoint();
        res.sendStatus(200);
      }
      else{
        res.status(403).send({msg:'您没有权限进行该操作'})
      }
    }
  };
};





