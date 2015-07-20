'use strict';
var mongoose = require('mongoose'),
    async = require('async');
var Gift = mongoose.model('Gift'),
    User = mongoose.model('User');
var log = require('../../services/error_log.js'),
    donlerValidator = require('../../services/donler_validator.js');

var maxGifts = 3; //最多3个
var recoveryHour = 3; //恢复时间3小时
var recoveryTime = recoveryHour*3600*1000;

  
var getRemain = function(gifts, nowTime) {

  //根据这次和上次的时间计算这次的余量
  var calRemainBasedOnLast = function(lastRemain, thisTime, lastTime) {
    var lastRemainNumber = lastRemain.remainGift;
    var timeDifference = thisTime - lastTime - lastRemain.remainTime; //timeDifference:这次与上次的时间差-之前剩余时间
    var recoveryGifts = Math.floor(timeDifference/recoveryTime)+1; //恢复几个礼物 [0~n]
    var thisRemain = Math.min(lastRemainNumber+recoveryGifts, maxGifts); //取最小值
    //计算恢复时间
    var thisRecoveryTime = timeDifference>=0 ?  (recoveryTime - timeDifference%recoveryTime) : -timeDifference; 
    thisRecoveryTime = thisRecoveryTime? thisRecoveryTime: recoveryTime; 
    if(thisRemain===maxGifts) {
      thisRecoveryTime = 0;
    }
    return {remainGift:thisRemain, remainTime:thisRecoveryTime};
  };

  //递归函数 获取上一个的余量
  var getLastRemain = function(index) {
    if(index === 0) {
      return {remainGift: maxGifts-1, remainTime:recoveryTime};
    }
    else {
      var lastRemain = getLastRemain(index-1);//上一次剩余的量
      lastRemain.remainGift --; //上次的减掉一个
      return calRemainBasedOnLast(lastRemain, gifts[index].createTime, gifts[index-1].createTime);
    }
  };

  if(gifts.length === 0 || (nowTime - gifts[gifts.length-1].createTime)>recoveryTime*maxGifts) {//9小时内没送过，必满
    return {remainGift:maxGifts, remainTime: 0};
  }
  else {
    var lastRemain = getLastRemain(gifts.length - 1); //获取上次送完的余量和恢复时间
    var thisRemain = calRemainBasedOnLast(lastRemain, nowTime, gifts[gifts.length-1].createTime);
    return thisRemain;
  }
};

var getGiftRemain = function(giftIndex, userId, callback) {

  //6点补满
  var nowTime = new Date();
  var last6oclock = new Date();
  last6oclock.setHours(6);
  last6oclock.setMinutes(0);
  last6oclock.setSeconds(0);
  if(last6oclock>nowTime) {
    last6oclock = last6oclock - 24*3600*1000;
  }
  Gift.find({giftIndex:giftIndex, sender:userId, createTime:{'$gt':last6oclock}},{createTime:1})
  .sort('createTime')
  .exec()
  .then(function(gifts) {
    var remains = getRemain(gifts, nowTime);
    callback(null,remains);
  })
  .then(null, function (err) {
    callback(err);
  })
};


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
      var remainGiftValidator = function(name, value, callback) {
        getGiftRemain(value, req.user._id, function(err, remains) {
          req.remains = remains;
          if(remains.remainGift===0) {
            callback(false, '礼物剩余不足');
          }
          else {
            callback(true);
          }
        })
      }
      donlerValidator({
        receiver: {
          name: '接收者',
          value: req.body.receiverId,
          validators: ['required',donlerValidator.inDatabase('User', '接收者数据有误')]
        },
        giftIndex: {
          name: '礼物编号',
          value: req.body.giftIndex,
          validators: [donlerValidator.enum([1,2,3,4,5], '礼物编号错误')]
        },
        replyGift: {
          name: '回复礼物',
          value: req.body.replyGift,
          validators: req.body.replyGift ? [donlerValidator.inDatabase('Gift', '回复的礼物参数有误')]: []
        },
        hasRemainGift: {
          name: '剩余礼物',
          value: req.body.giftIndex,
          validators: [remainGiftValidator]
        }
      }, 'complete', function (pass, msg) {
        if(!pass) {
          var returnData = {msg: donlerValidator.combineMsg(msg)}
          if(!req.remains.remainGift) {
            returnData.remainTime = req.remains.remainTime;
          }
          return res.status(400).send(returnData);
        }
        next();
      })
    },
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
          req.remains.remainGift --;
          return res.status(200).send({gift:gift, remain:req.remains});
        }
      })
    },
    //根据id取礼物详情
    //是否需要验证谁能看这个礼物详情?
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
      if(req.params.content === 'concern') {
        async.parallel({
          flower: function(callback) {
            getGiftRemain(1, req.user._id, callback);
          },
          coffee:function(callback) {
            getGiftRemain(2, req.user._id, callback);
          },
          hug:function(callback) {
            getGiftRemain(3, req.user._id, callback);
          },
        },function(err, results) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'余量查询失败'});
          }
          return res.status(200).send(results);
        });
      }
      else if(req.params.content === 'heart') {
        getGiftRemain(4, req.user._id, function(err, remains) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'余量查询失败'});
          }
          return res.status(200).send({'heart':remains});
        });
      }
      else {
        return res.status(400).send({msg:'参数错误'});
      }

      //暂时的test
      // var gifts = [
      //   {createTime: new Date(2015,6,17,7)},
      //   {createTime: new Date(2015,6,17,8)},
      //   {createTime: new Date(2015,6,17,9)}
      // ]
      // var remains = [];
      // for(var i=9;i<23;i++) {
      //   var remain =  getRemain(gifts, new Date(2015,6,17,i,1));
      //   remains.push(remain);
      // }
      // return res.status(200).send(remains);
    }
  }
}
