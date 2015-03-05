'use strict';

var path = require('path');

var mongoose = require('mongoose');
var Rank = mongoose.model('Rank'),
    CompanyGroup = mongoose.model('CompanyGroup');
var log = require('../services/error_log.js'),
    donlerValidator = require('../services/donler_validator.js');
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
        },
        rankType:{
          name: '榜单类型',
          value: req.query.rankType,
          validators: ['required',donlerValidator.enum(['activity', 'score'])]
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          Rank.find({'city.province':unescape(req.query.province),'city.city':unescape(req.query.city),'group_type._id':req.query.gid,'rank_type':req.query.rankType})
          .sort('-create_date')
          .limit(1)
          .exec()
          .then(function (rank) {
            if (!rank) {
              res.status(400).send({ msg: '没有找到对应的榜单' });
            } else {
              res.send(rank)
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
      donlerValidator({
        rankType:{
          name: '榜单类型',
          value: req.query.rankType,
          validators: ['required',donlerValidator.enum(['activity', 'score'])]
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          var team = req.companyGroup;
          var rankString ='score_rank.rank';
          var rankQuery = {'$lte' : team.score.rank + 5,'$gte' : team.score.rank - 5}
          var option ={'city.province':unescape(team.city.province),'city.city':unescape(team.city.city),'gid':team.gid}
          if(req.query.rankType=='activity'){
            option['score.rank']= rankQuery;
          }
          else{
            option['score_rank.rank']= rankQuery;
          }
          console.log(option);
          CompanyGroup.find(option,{score: 1,score_rank: 1,name: 1,logo: 1})
          .sort(rankString)
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
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    }
  };
};

