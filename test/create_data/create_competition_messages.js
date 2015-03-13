'use strict';

var async = require('async');
var chance = require('chance').Chance();

var common = require('../support/common');
var mongoose = common.mongoose;
var CompetitionMessage = mongoose.model('CompetitionMessage'),
    Vote = mongoose.model('Vote');

/**
 * 为公司增加挑战信数据
 * 
 * example:
 *  var companyData = {
 *    model: doc,
 *    ...
 *  };
 *  createChats(companyData, function (err) {});
 *
 *  // 然后 companyData 将添加chats:
 *  companyData: {
 *    model: doc,
 *    ...
 *    competitionMessages : [doc] //0~7为公司内，8~11为公司外(仅公司0有).
 *  }
 *
 * @param {array} companies
 */
var createMessages = function (companies, callback) {
  async.waterfall([
    function(waterfallCallback) {
      //公司内联谊信
      //每个company0~7封是公司内的
      //每个公司1给0,2给3,发四封挑战信,分别对应四个状态。
      async.map(companies, function(company, mapCallback) {
        createInCompanyMessages(company, mapCallback);
      }, function(err, result) {
        waterfallCallback(err);
      });
    },
    //生成公司外的挑战信
    //公司1的team[0]给公司0的team[0]发四封挑战信，分别对应四个状态,存在第一个公司的8~11里。
    function( waterfallCallback) {
      createBetweenCompanyMessages(companies, waterfallCallback);
    }
  ], function(err, results){
    callback(err, companies);
  })
};

/**
 * 创建公司联谊信
 * @param  {Object}   company
 * @param  {Function} callback 形如function(err)
 */
var createInCompanyMessages = function(company, callback) {
  if(company.teams.length===0) return callback();
  company.competitionMessages = new Array(12);
  async.times(8, function(n,next) {
    var sponsor = n<2? company.teams[1].model : company.teams[2].model;
    var opposite = n<2? company.teams[0].model : company.teams[3].model;
    var statusEnums = ['sent', 'accepted', 'rejected', 'competing'];
    var status = statusEnums[n%4];
    createMessage(sponsor, opposite, '2', status, function(err, message) {
      company.competitionMessages[n] = message;
      next();
    })
  },function(err) {
    callback(err);
  })
};

/**
 * 创建公司间挑战信
 * @param  {array}   companies 
 * @param  {Function} callback 形如 function(err)
 */
var createBetweenCompanyMessages = function(companies, callback) {
  async.times(4, function(n, next) {
    var sponsor = companies[1].teams[0].model;
    var opposite = companies[0].teams[0].model;
    var statusEnums = ['sent', 'accepted', 'rejected', 'competing'];
    var status = statusEnums[n%4];
    createMessage(sponsor, opposite, '1', status, function(err, message) {
      companies[0].competitionMessages[n+8] = message;
      next();
    });
  },function(err) {
    callback(err);
  });
};
/**
 * 创建挑战信及投票
 * @param  {Object|team} sponsor  发起者小队
 * @param  {Object|team} opposite 对手小队
 * @param  {number} type     挑战1or联谊2
 * @param  {string} status   'sent', 'accepted', 'rejected', 'competing'
 * @param  {Function} callback 形如function (err, message) 
 */
var createMessage = function(sponsor, opposite, type, status, callback) {
  var message = new CompetitionMessage({
    sponsor_team: sponsor._id,
    sponsor_cid: sponsor.cid,
    opposite_team: opposite._id,
    opposite_cid: opposite.cid,
    competition_type: type,
    status: status,
    content: chance.string({length: 20})
  });
  Vote.establish(message, function(err, vote) {
    if(err) {
      callback(err);
    }else {
      message.vote = vote._id;
    }
  });
  if(status!=='sent') {
    message.deal_time = new Date();
  }
  message.save(function(err) {
    if(err) {
      callback(err);
    }else {
      callback(null, message);
    }
  });
}

module.exports = createMessages;
