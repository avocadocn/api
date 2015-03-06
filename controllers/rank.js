'use strict';

var path = require('path');

var mongoose = require('mongoose');
var Rank = mongoose.model('Rank'),
    Company = mongoose.model('Company'),
    CompanyGroup = mongoose.model('CompanyGroup');
var async = require('async');
var log = require('../services/error_log.js'),
    donlerValidator = require('../services/donler_validator.js');
var timeLimit = 7 * 24 * 60 * 60 * 1000;
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
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          var now = new Date();
          var option = {
            'city.province': unescape(req.query.province),
            'city.city':unescape(req.query.city),
            'rank_type':req.query.rankType,
            'create_date':{$gte:new Date(Date.now()-timeLimit)}
          }
          if(req.query.gid){
            option['group_type._id']=req.query.gid
          }
          Rank.find(option)
          .sort('-create_date')
          .exec()
          .then(function (ranks) {
            if (!ranks) {
              res.status(400).send({ msg: '没有找到对应的榜单' });
            } else {
              res.send(ranks)
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
      var option ={
        'city.province':unescape(team.city.province),
        'city.city':unescape(team.city.city),
        'gid':team.gid,
        'score_rank.rank':{
          '$lte' : team.score_rank.rank + 5,
          '$gte' : team.score_rank.rank - 5
        }
      }
      CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1})
      .sort('score_rank.rank')
      .limit(11)
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
                '$lte' : team.score_rank.rank + 5,
                '$gte' : team.score_rank.rank - 5
              }
            }
            CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1,gid:1})
            .sort('score_rank.rank')
            .limit(11)
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
    }
  };
};





