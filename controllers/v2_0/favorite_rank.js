'use strict';

var path = require('path'),
  moment = require('moment');

var mongoose = require('mongoose');
var FavoriteRankModel = mongoose.model('FavoriteRankModel');
var User = mongoose.model('User');
var Gift = mongoose.model('Gift');

var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  tools = require('../../tools/tools.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  async = require('async');

module.exports = {
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
     * [
     *  { "_id" : ObjectId("53b0cf036ee6998827948c46"), "score" : 2 },
     *  { "_id" : ObjectId("53d79a8e38cf9def07d1ca25"), "score" : 1 },
     *  { "_id" : ObjectId("53d798d638cf9def07d1ca23"), "score" : 1 },
     *  ... ...
     * ]
     * @return {[type]}     [description]
     */
    getBillboard: function(req, res) {
      // 本周查询时间的设定
      var m =  moment();
      if (moment().day === 0) {
        m = moment().day(-1);
      }
      m.day(1);
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
      }, {
        $group: {
          '_id': '$receiver',
          'score': {
            $sum: 1
          }
        }
      }, {
        $sort: {
          'score': -1,
          '_id': 1
        }
      }, {
        $limit: req.query.limit || 10
      }];

      // 榜单类型的选择
      if (req.query.type) {
        switch (req.query.type) {
          case '1':
            aggregateOptions[0].$match.receiverGender = 1;
            break;
          case '2':
            aggregateOptions[0].$match.receiverGender = 2;
            break;
          case '3':
            aggregateOptions[0].$match.giftIndex = {
              $in: [1, 2, 3]
            };
            break;
          default:
            break;
        }
      }
      // 分页查询
      if (req.query.score && req.query.id) {
        aggregateOptions.splice(3, 0, {
          $match: {
            $or: [{
              'score': {
                $gt: parseInt(req.query.score)
              }
            }, {
              $and: [{
                'score': {
                  $eq: parseInt(req.query.score)
                }
              }, {
                '_id': {
                  $gt: mongoose.Types.ObjectId(req.query.id)
                }
              }]
            }]
          }
        });
      }

      Gift.aggregate(aggregateOptions).exec(function(err, billboard) {
        if (err) {
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        }
        // 用户基本信息可以通过sqlite在前端获取，这样效率或许更好点
        res.status(200).send({
          billBoard: billboard
        });
      });
    }
};