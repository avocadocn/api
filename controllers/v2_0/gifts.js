'use strict';
var mongoose = require('mongoose');
var Gift = mongoose.model('Gift'),
    User = mongoose.model('User');

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
    sendGift: function (req, res) {
      
    },
    getGift: function (req, res) {
      
    },
    getUserGiftRemain: function (req, res) {
      
    }
  }
}
