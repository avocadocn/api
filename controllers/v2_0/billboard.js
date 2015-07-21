'use strict';

var path = require('path'),
  moment = require('moment');

var mongoose = require('mongoose');
var BillBoard = mongoose.model('BillBoard');
var User = mongoose.model('User');
var Gift = mongoose.model('Gift');

var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  tools = require('../../tools/tools.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  async = require('async');

module.exports = function(app) {
  return {
    /**
     * 获取榜单
     * 
     * @param  {[type]} req [description]
     * req.query
     * {
     *   cid: String, // 榜单公司id
     *   type: Number, // 榜单类型 1男神榜 2女神榜 3人气榜
     *   limit: Number, // 查询数量(分页查询使用)
     *   score: Number, // 积分(分页查询使用)
     *   id: String // 上一页最后一名用户的id(分页查询使用)
     * }
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getBillboard: function(req, res) {
      var m = moment().day('Monday');
      m.set('hour', 0);
      m.set('minute', 0);
      m.set('second', 0);
      m.set('millisecond', 0);

      var aggregateOptions = [{
        $match: {
          'cid': mongoose.Types.ObjectId(req.query.cid),
          'createTime': {
            $gt: new Date(m.format())
          }
        }
      }];

      switch(req.qury.type) {
        case 1:
          aggregateOptions[0].$match['receiverGender'] = 1;
          break;
        case 2:
          
          break;
        case 3:

          break;
        default:
          break;
      }

      Gift.aggregate(aggregateOptions).exec(function(err, billboard) {
        if (err) {
          callback(err);
        }
        res.status(200).send({
          msg: billboard
        });
      });
    }
  };
};