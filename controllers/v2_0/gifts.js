'use strict';
var mongoose = require('mongoose');
var Gift = mongoose.model('Gift'),
    User = mongoose.model('User');
var log = require('../../services/error_log.js');
module.exports = function (app) {
  return {
    getUserGifts: function (req, res) {
      
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
        gift_index: req.body.giftIndex,
        addition: req.body.addition,
        cid: req.user.cid
      });
      if(req.body.replyGift) {
        gift.reply_gift = req.body.replyGift;
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
      .populate('reply_gift')
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
      
    }
  }
}
