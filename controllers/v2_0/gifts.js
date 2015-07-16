'use strict';
var mongoose = require('mongoose');
var Gift = mongoose.model('Gift'),
    User = mongoose.model('User');
var log = require('../../services/error_log.js');
module.exports = function (app) {
  return {
    getUserGifts: function (req, res) {
      //暂时只能看自己的
      if(req.user._id.toString() != req.params.userId) {
        return res.status(403);
      }
      var option = {};
      if(req.params.direction === 'send') {
        option.sender = req.params.userId;
      }
      else if(req.params.direction === 'receive') {
        option.receiver = req.params.userId;
      }
      else {
        return res.status(400).send({msg:'参数不正确'});
      }
      var limit = req.params.limit || 20;
      if(req.params.lastTime) {
        option.createTime = {'$lt': req.params.lastTime}
      }
      Gift.find(option)
      .sort('-createTime')
      .limit(limit)
      .populate('replyGift')
      .exec()
      .then(function (gifts) {
        return res.status(200).send({gifts:gifts});
      })
      .then(null, function(err) {
        log(err);
        return res.status(500).send({msg: '查询失败'});
      })
    },
    //先验证是否能发
    validateGiftRemain: function (req, res, next) {
      var canSend = true;
      if(canSend) {
        next();
      }
      else {
        return res.status(403);
      }
    },
    //缺少一步验证数据正确性
    sendGift: function (req, res) {
      var gift = new Gift({
        sender: req.user._id,
        receiver: req.body.receiverId,
        giftIndex: req.body.giftIndex,
        addition: req.body.addition,
        cid: req.user.cid
      });
      if(req.body.replyGift) {
        gift.replyGift = req.body.replyGift;
      }
      gift.save(function (err) {
        if(err) {
          return res.status(500).send({msg:'保存礼物失败'});
        }
        else {
          return res.status(200).send({gift:gift});
        }
      })
    },
    //根据id取礼物详情
    getGift: function (req, res) {
      Gift.findOne({_id:req.params.giftId})
      .populate('replyGift')
      .exec()
      .then(function (gift) {
        return res.status(200).send({gift:gift});
      })
      .then(null, function (err){
        log(err);
        return res.status(500).send({msg: '查询失败'});
      });
    },
    getUserGiftRemain: function (req, res) {
      //两种情况，1：获取爱心余量，2：获取关心里的剩余资源
      //方法，获取9小时内的记录，由记录的时间计算得到现在还剩多少
      
    }
  }
}
