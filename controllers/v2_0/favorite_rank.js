'use strict';

var path = require('path'),
  moment = require('moment');

var mongoose = require('mongoose');
var FavoriteRank = mongoose.model('FavoriteRank');
var User = mongoose.model('User');
var Gift = mongoose.model('Gift');
var Team = mongoose.model('Team');

var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  tools = require('../../tools/tools.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  async = require('async');

var redisService = require('../../services/redis_service.js');
var perPage =10;
module.exports = {
    /**
     * 获取榜单
     * 
     * @param  {[type]} req [description]
     * req.query
     * {
     *   cid: String, // 榜单公司id
     *   type: Number, // 榜单类型 1男神榜 2女神榜 3人气榜(已经移除)
     *   limit: Number, // 查询数量(分页查询使用)
     *   vote: Number, // 积分(分页查询使用)
     *   id: String // 上一页最后一名用户的id(分页查询使用)
     * }
     * @param  {[type]} res [description]
     * [
     *  { "_id" : ObjectId("53b0cf036ee6998827948c46"), "vote" : 2 },
     *  { "_id" : ObjectId("53d79a8e38cf9def07d1ca25"), "vote" : 1 },
     *  { "_id" : ObjectId("53d798d638cf9def07d1ca23"), "vote" : 1 },
     *  ... ...
     * ]
     * @return {[type]}     [description]
     */
    getFavoriteRank: function(req, res) {
      // 本周查询时间的设定
      // var m =  moment();
      // if (moment().day === 0) {
      //   m = moment().day(-1);
      // }
      // m.day(1);
      // m.set('hour', 0);
      // m.set('minute', 0);
      // m.set('second', 0);
      // m.set('millisecond', 0);
      // console.time("rank")
      var aggregateOptions = [{
        $match: {
          'cid': mongoose.Types.ObjectId(req.query.cid)
        }
      }, {
        $group: {
          '_id': '$receiver',
          'vote': {
            $sum: 1
          }
        }
      }, {
        $sort: {
          'vote': -1,
          '_id': 1
        }
      }];

      // 榜单类型的选择
      switch (req.query.type) {
        case '1':
          aggregateOptions[0].$match.receiverGender = true;
          aggregateOptions[0].$match.giftIndex = 4;
          break;
        case '2':
          aggregateOptions[0].$match.receiverGender = false;
          aggregateOptions[0].$match.giftIndex = 4;
          break;
        // case '3':
        //   aggregateOptions[0].$match.giftIndex = {
        //     $in: [1, 2, 3]
        //   };
        //   break;
        default:
          break;
      }
      // 分页查询
      // if (req.query.vote && req.query.id) {
      //   aggregateOptions.splice(3, 0, {
      //     $match: {
      //       $or: [{
      //         'vote': {
      //           $gt: parseInt(req.query.vote)
      //         }
      //       }, {
      //         $and: [{
      //           'vote': {
      //             $eq: parseInt(req.query.vote)
      //           }
      //         }, {
      //           '_id': {
      //             $gt: mongoose.Types.ObjectId(req.query.id)
      //           }
      //         }]
      //       }]
      //     }
      //   });
      // }

      Gift.aggregate(aggregateOptions).exec(function(err, favoriteRank) {
        if (err) {
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        }
        // 用户基本信息可以通过sqlite在前端获取，这样效率或许更好点
        res.status(200).send({
          favoriteRank: favoriteRank
        });
        var elements = [];
        for (var i = favoriteRank.length - 1; i >= 0; i--) {
          elements.push(favoriteRank[i].vote);
          elements.push(favoriteRank[i]._id);
        };
        redisService.redisRanking.addEleToZSET(req.query.cid, req.query.type, elements)
          .then(function(result) {
            //TODO:
            // console.timeEnd("rank")
            // console.log(result)
          })
          .then(null, function(err) {
            log(err);
          });
      });
    },
    /**
     * 获取榜单(redis缓存)
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getRankFromRedis: function(req, res, next) {
      var page = parseInt(req.query.page);
      // isNaN(page) 排除req.query.page头字符为非数字
      // TODO: 增加条件
      if (!req.query.page || isNaN(page) || page < 1) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      var num = req.query.limit || 10;
      var parseRes = function(arr) {
        var res = [];
        for (var i = 0; i < arr.length; i+= 2) {
          res.push({'_id': arr[i], 'vote': arr[i + 1]});
        }
        return res;
      }

      redisService.redisRanking.getEleFromZSET(req.query.cid, req.query.type, [(page - 1) * num, page * num - 1])
      .then(function(result) {
        if (result.exist) {

          res.status(200).send({
            ranking: parseRes(result.value)
          });
        } else {
          next();
        }
      })
      .then(null, function(err) {
        log(err);
        next();
      });
    },
    /**
     * 获取榜单(mongodb)
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getRankFromDB: function(req, res) {
      var conditions = {
        'cid': mongoose.Types.ObjectId(req.query.cid)
      };

      // 榜单类型的选择
      if (req.query.type) {
        switch (req.query.type) {
          case '1':
            conditions.type = 1;
            break;
          case '2':
            conditions.type = 2;
            break;
          case '3':
          default:
            conditions.type = 3;
            break;
        }
      }
      // 分页查询
      if (req.query.vote && req.query.id) {
        conditions.$or = [{
          'vote': {
            $gt: parseInt(req.query.vote)
          }
        }, {
          $and: [{
            'vote': {
              $eq: parseInt(req.query.vote)
            }
          }, {
            '_id': {
              $gt: mongoose.Types.ObjectId(req.query.id)
            }
          }]
        }];
      }
      var limit = req.query.limit || 10;

      FavoriteRank.find(conditions)
        .sort({
          'vote': -1,
          'userId': 1
        })
        .limit(limit)
        .exec()
        .then(function(ranking) {
          var result = ranking.map(function(e) {
            return {'_id': e.userId, 'vote': e.vote};
          });

          res.status(200).send({
            ranking: result
          });
          // 更新redis
          var elements = [];

          ranking.forEach(function(e) {
            elements.push(e.vote);
            elements.push(e.userId);
          });
          
          redisService.redisRanking.addEleToZSET(req.query.cid, req.query.type, elements);
        })
        .then(null, function(err) {
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        });
    },
    /**
     * 获取小队排行榜
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getTeamRank:function(req, res) {
      var skip = isNaN(parseInt(req.query.page)) ? 0 : parseInt(req.query.page) * perPage;
      var _limit = isNaN(parseInt(req.query.limit)) ? perPage : parseInt(req.query.limit);
      Team.find({cid: req.user.cid, active: true})
        .sort({"score.total": -1,"level": -1})
        .limit(_limit)
        .skip(skip)
        .exec()
        .then(function(teams){
          res.send(teams);
        })
        .then(null,function(err){
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        });
    }
};