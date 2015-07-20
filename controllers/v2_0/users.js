'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var log = require('../../services/error_log.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    tools = require('../../tools/tools.js');
module.exports = function (app) {
  return {
    validateConcern: function (req, res, next) {
      donlerValidator({
        concern:{
          name: '关注人id',
          value: req.params.userId,
          validators: [donlerValidator.inDatabase('User', '关注者不存在')]
        }
      })
    },
    addConcern: function (req, res) {
      var newConcern = {
        user: req.params.userId,
        create_time: new Date()
      }
      if(!req.user.concern) {
        req.user.concern = [newConcern];
      }
      else {
        req.user.concern.push(newConcern);
      }
      req.user.save(function(err) {
        if(err) {
          log(err);
          return res.status(500).send('保存出错');
        }
        else{
          return res.status(200);
        }
      });
    },
    getConcern: function (req, res) {
      return res.status(200).send({concern: req.user.concern});
    },
    deleteConcern: function (req, res) {
      var index = tools.arrayObjectIndexOf(req.user.concerns, req.params.userId, 'user');
      if(index>-1) {
        req.user.concerns.splice(index,1);
        req.user.save(function(err) {
          if(err) {
            log(err);
            return res.status(500).send('保存出错');
          }
          else{
            return res.status(200);
          }
        });
      }
      else {
        return res.status(200);
      }
    }
  }
};