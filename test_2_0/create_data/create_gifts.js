'use strict';
var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var Gift  = mongoose.model('Gift');
var chance = require('chance').Chance();

/**
 * [createGift description]
 * @param  {[type]}   opts     
 *         {
 *           sender: User,
 *           receiver: User,
 *           index: number,
 *           createTime: Date,
 *           cid: cid,
 *           replyGift: Gift
 *         }
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
var createGift = function(opts, callback) {
  var gift = new Gift({
    sender: opts.sender._id,
    receiver: opts.receiver._id,
    receiverGender: opts.receiver.gender,
    giftIndex: opts.index,
    createTime: opts.createTime,
    addition: chance.string(),
    received: false,
    cid: chance.cid
  });
  opts.replyGift && gift.replyGift = opts.replyGift;
  gift.save(function (err) {
    callback(err, gift);
  });
};

var anHour = 3600 * 1000;
var createGifts = function(company, callback) {
  if (company.status.mail_active === false) {
    callback(null, []);
    return;
  }
  
  var gifts = [];
  async.waterfall([
    //公司第一个人送第二个人1 2 3 4 5各3个 时间分别相隔一小时
    function(wcb) {
      var i = 0;
      async.whilst(
        function() {return i<15},
        function(cb) {
          var opts = {
            sender: company.users[0],
            receiver: company.users[1],
            index: Math.floor(i/3) +1,
            createTime: new Date() - 2*anHour + i%3*anHour,
            cid: company.model._id
          };
          createGift(opts, function(err, gift) {
            i++;
            gifts.push(gift);
            cb(err);
          });
        }
      )
    },
    //第二个人回送第一个人各一个?
    function(wcb) {
      var i = 0;
      var nowTime = new Date();
      async.whilst(
        function() {return i<5},
        function(cb) {
          var opts = {
            sender: company.users[1],
            receiver: company.users[0],
            index: i + 1,
            createTime: new Date(),
            cid: company.model._id,
            replyGift: gifts[3*i]._id
          };
          createGift(opts, function(err, gift) {
            i++;
            gifts.push(gift);
            cb(err);
          });
        }
      )
    }
  ], function(err, results) {
    callback(err, gifts);
  });
};

module.exports = createGifts;