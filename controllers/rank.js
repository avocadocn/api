'use strict';

var path = require('path');

var mongoose = require('mongoose');
var Rank = mongoose.model('Rank');

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
      
    }
  };
};

