'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var log = require('../../services/error_log.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    tools = require('../../tools/tools.js');
module.exports = {
    validateConcern: function (req, res, next) {
      donlerValidator({
        concern:{
          name: '关注人id',
          value: req.params.userId,
          validators: [donlerValidator.inDatabase('User', '关注者不存在')]
        }
      }, 'complete', function (pass, msg) {
        if(!pass) {
          var msg = donlerValidator.combineMsg(msg);
          return res.status(400).send({msg:msg});
        }
        else {
          next();
        }
      })
    },
    addConcern: function (req, res) {
      var newConcern = {
        user: req.params.userId,
        createTime: new Date()
      }
      if(!req.user.concern) {
        req.user.concern = [newConcern];
      }
      else {
        var index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
        if(index === -1) {
          req.user.concern.push(newConcern);
        }
        else {
          return res.status(200).send({msg:'已关注过'});
        }
      }
      req.user.save(function(err) {
        if(err) {
          log(err);
          return res.status(500).send({msg:'保存出错'});
        }
        else{
          return res.status(200).send({msg:'添加关注成功'});
        }
      });
    },
    getConcern: function (req, res) {
      //暂时只能获取自己的
      return res.status(200).send({concern: req.user.concern});
    },
    deleteConcern: function (req, res) {
      var index = -1;
      if(req.user.concern){
        index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
      }
      console.log(req.user.concern);
      console.log(index);
      if(index>-1) {
        req.user.concern.splice(index,1);
        req.user.save(function (err) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'保存出错'});
          }
          else{
            return res.status(200).send({msg:'取消关注成功'});
          }
        });
      }
      else {
        return res.status(200).send({msg:'取消关注成功'});
      }
    }
};