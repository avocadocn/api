'use strict';

var path = require('path');

var mongoose = require('mongoose');
var Rank = mongoose.model('Rank'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup');
var async = require('async');
var log = require('../services/error_log.js'),
    donlerValidator = require('../services/donler_validator.js'),
    auth = require('../services/auth.js');
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
            'rank_type':req.query.rankType,
            // 'create_date':{$gte:new Date(Date.now()-timeLimit)},
            'group_type._id':req.query.gid
          }
          Rank.find(option)
          .sort('-create_date')
          .limit(1)
          .exec()
          .then(function (rank) {
            if (!rank) {
              res.status(400).send({ msg: '没有找到对应的榜单' });
            } else {
              var cid = req.user.cid || req.user._id;
              CompanyGroup.find({cid: cid ,gid:req.query.gid},{cid: 1,name:1,logo:1,gid: 1,score:1,score_rank:1})
              .exec()
              .then(function (teams) {
                if (!teams) {
                  res.send({rank:rank[0]});
                } else {
                  res.send({rank:rank[0],team:teams});
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
          '$gte' : team.score_rank.rank - forwardTeamNum
        }
      }
      CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1})
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
    }
  };
};





