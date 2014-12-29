'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User'),
    CompanyGroup = mongoose.model('CompanyGroup'),
    Company = mongoose.model('Company');

var log = require('../services/error_log.js');

module.exports = {

  getTeamById : function(req, res, next) {
    if (!req.params.teamId ) {
      return res.status(400).send({ msg: 'teamId不能为空' });
    }

    CompanyGroup.findById(req.params.teamId).populate('poster._id').exec()
    .then(function (companyGroup) {
      if (!companyGroup) {
        res.status(400).send({ msg: '没有找到对应的小队' });
      } else {
        req.companyGroup = companyGroup;
        next();
      }
    })
    .then(null, function (err) {
      log(err);
      return res.status(500).send({msg: '查找小队错误'});
    });
  },
  
  getUserById : function(req, res, next) {
    if (!req.params.userId ) {
      return res.status(400).send({ msg: 'userId不能为空' });
    }

    User.findById(req.params.userId).exec()
    .then(function (user) {
      if (!user) {
        res.status(400).send({ msg: '没有找到对应的用户' });
      } else {
        req.resourceUser = user;
        next();
      }
    })
    .then(null, function (err) {
      log(err);
      return res.status(500).send({msg: '查找用户错误'});
    });
  }
};