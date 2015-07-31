'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Notification = mongoose.model('Notification');
var log = require('../../services/error_log.js');

var updateNfct = function(notification, senderId) {
  notification.sender = senderId;
  notification.relativeCount++;
  notification.createTime = new Date();
  notification.save(function(err) {
    if(err) {
      log(err);
    }
  });
};

module.exports = {
  /**
   * 发送互动通知
   * @param  {number}       action            互动动作
   * @param  {Interaction}  interaction       互动对象
   * @param  {string}       senderId          发送者Id
   * @param  {string|array} receiver          接收者Id 活动关闭了通知所有人
   * @param  {Comment}      comment(optional) 评论对象(可选)    
   */
  sendInteractionNfct: function(action, interaction, senderId, receiver, comment) {
    var createNfct = function(receiverId) {
      var notification = new Notification({
        noticeType: 1,
        interactionType: interaction.type,
        interaction: interaction._id,
        action: action,
        sender: senderId,
        receiver: receiverId
      });
      if(action !==5) {
        notification.content = comment ? comment.content : interaction.theme
      }
      if(action === 4 || action === 5) {
        notification.reply = comment._id;
      }
      if(action === 1 || action === 5) {
        notification.relativeCount = 1;
      }
      notification.save(function(err) {
        if(err) {
          log(err);
        }
      });
    };

    var findNfct = function(err, notification) {
      if(err) {
        log(err);
        return;
      }
      if(notification) {
        updateNfct(notification, senderId);
      }
      else {
        createNfct(receiver);
      }
    };

    if(action === 1) { //如果是有人参加
      Notification.findOne({interaction:interaction._id, action:1, noticeType:1, receiver:receiver},findNfct);
    }
    else if(action === 5) { //如果是赞 查找一下
      Notification.findOne({replyTo:comment._id, action:5, noticeType:1, receiver:receiver},findNfct);
    }
    else if(action === 9) { //如果是活动被关闭了，发给所有人
      if(receiver.length) {
        for(var i = receiver.length-1; i>=0; i--) {
          if(receiver[i].toString !== senderId) {
            createNfct(receiver[i]);
          }
        }
      }
    }
    else {
      createNfct(receiver);
    }
  },
  /**
   * 送/拆礼物的通知
   * @param  {Gift} gift      礼物
   * @param  {Number} direction 1送/2拆 
   */
  sendGiftNfct: function(gift, direction) {
    Notification.create({
      noticeType: 2,
      gift: gift._id,
      giftDirection: direction,
      sender: direction === 1 ? gift.sender : gift.receiver,
      receiver: direction === 1 ? gift.receiver : gift.sender
    }, function(err) {
      if(err) {
        log(err);
      }
    });
  },
  /**
   * 发送小队相关的通知
   * @param  {Number}   action      互动动作 6/7/8
   * @param  {Team}     team        小队
   * @param  {string}   senderId    发送者Id
   * @param  {string}   receiverId  接收者Id
   */
  sendTeamNtct: function(action, team, senderId, receiverId) {
    var createTeamNfct = function() {
      Notification.create({
        noticeType: 2,
        team: team._id,
        action: action,
        sender: senderId,
        receiver: receiverId,
        content: team.name
      }, function(err) {
        if(err) {
          log(err);
        }
      });
    }
    if(action === 8) {
      Notification.findOne({receiver: receiverId, team:team._id, action:8, noticeType:2},
        function(err, notification) {
        if(err) {
          log(err);
          return;
        }
        if(notification) {
          updateNfct(notification, senderId);
        }
        else {
          createTeamNfct();
        }
      });
    }
    else {
      createTeamNfct();
    }
  },
  getNotifications: function(req, res) {
    var options = {receiver:{$in:[req.user._id, null]}};
    switch(req.params.noticeType) {
      case 'interaction':
        options.noticeType = 1;
        break;
      case 'notice':
        options.noticeType = 2;
        break;
      default:
        return res.status(400).send({msg:'参数错误'});
    }
    Notification.find(options)
    .sort('-createTime')
    .exec()
    .then(function(notifications) {
      res.status(200).send(notifications);
      //删除通知
      options.receiver = req.user._id;
      Notification.remove(options, function(err, number) {
        if(err) {
          log(err);
        }
      });
      return;
    })
    .then(null, function(err) {
      log(err);
      return res.status(500).send({msg:'查找通知出错'});
    })
  }

};