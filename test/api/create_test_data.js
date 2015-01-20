'use strict';

var common = require('./common');
var mongoose = common.mongoose;

var async = require('async');

/**
 * 生成公司数据
 * @param {Function} callback 形式为function(err, companies){}
 */
var createCompanies = function (callback) {
  // todo
};

/**
 * 为公司生成小队
 * @param {Object} company
 * @param {Function} callback 形式为function(err, teams){}
 */
var createTeams = function (company, callback) {
  // todo
};

/**
 * 创建公司的成员
 * @param {Object} company
 * @param {Function} callback 形式为function(err, users){}
 */
var createUsers = function (company, callback) {
  // todo
};

/**
 * 让公司的部分员工加入几个小队
 * @param {Array} users 公司的所有成员
 * @param {Array} teams 公司的小队列表
 * @param {Function} callback 形式为function(err){}
 */
var addUsersToTeams = function (users, teams, callback) {
  // todo
};

/**
 * 创建公司活动
 * @param {Object} company
 * @param {Function} callback 形式为function(err, campaigns){}
 */
var createCompanyCampaigns = function (company, callback) {
  // todo
};

/**
 * 创建小队活动
 * @param {Object} company
 * @param {Object} team
 * @param {Function} callback 形式为function(err, campaigns){}
 */
var createTeamCampaigns = function (company, team, callback) {
  // todo
};

/**
 * 创建公司内部挑战
 * @param {Object} company
 * @param {Array} teams 公司所有小队
 * @param {Function} callback 形式为function(err, campaigns){}
 */
var createInnerProvokes = function (company, teams, callback) {
  // todo
};

/**
 * 创建跨公司的挑战
 * example:
 *  createCompanyProvokes([{
 *    company: mongoose.model('Company'),
 *    teams: [mongoose.model('CompanyGroup')]
 *  }], function (err, campaigns){})
 * @param {Array} companyDataList 公司数据
 * @param {Function} callback 形式为function(err, campaigns){}
 */
var createCompanyProvokes = function (companyDataList, callback) {
  // todo
};

/**
 * 让公司成员参加非跨公司挑战的活动。
 * 不必所有成员都参加活动，不必所有活动都有成员参加。
 * @param {Array} users 公司所有成员
 * @param {Array} campaigns 所有活动
 * @param {Function} callback 形式为function(err){}
 */
var addUsersToCampaigns = function (users, campaigns, callback) {
  // todo
};


/**
 * 生成测试数据
 * @param {Function} callback 完成后的回调函数，形式为function(err){}
 */
exports.createData = function (callback) {

  createCompanies(function (err, companies) {
    // 为每个公司生成小队、用户、活动等数据
    async.map(companies, function (company, mapCallback) {
      async.waterfall([
        function (waterfallCallback) {
          // 生成小队、用户数据
          async.parallel({
            createTeams: function (parallelCallback) {
              // 生成小队数据
              createTeams(company, parallelCallback);
            },
            createUsers: function (parallelCallback) {
              // 生成用户数据
              createUsers(company, parallelCallback);
            }
          }, function (err, results) {
            // 将小队和用户数据往下传递
            waterfallCallback(err, {
              teams: results.createTeams,
              users: results.createUsers
            });
          });
        },
        function (data, waterfallCallback) {
          // 用户加入小队
          addUsersToTeams(data.users, data.teams, function (err) {
            waterfallCallback(err, {
              teams: data.teams,
              users: data.users
            });
          });
        },
        function (data, waterfallCallback) {
          // 生成除跨公司挑战外的活动
          async.parallel({
            createCompanyCampaigns: function (parallelCallback) {
              createCompanyCampaigns(company, parallelCallback);
            },
            createTeamCampaigns: function (parallelCallback) {
              createTeamCampaigns(company, data.teams, parallelCallback);
            },
            createInnerProvokes: function (parallelCallback) {
              createInnerProvokes(company, data.teams, parallelCallback);
            }
          }, function (err, results) {
            var campaigns = [];
            campaigns.concat(results.createCompanyCampaigns, results.createTeamCampaigns, results.createInnerProvokes);
            addUsersToCampaigns(data.users, campaigns, function (err) {
              // 将小队数据传递给结果处理函数
              waterfallCallback(err, data.teams);
            });

          });
        }
      ], function (err, result) {
        // mapCallback 公司及小队数据，以便生成跨公司挑战
        mapCallback(err, {
          company: company,
          teams: result
        });
      });
    }, function (err, results) {
      // 生成跨公司的挑战数据
      createCompanyProvokes(results, function (err, campaigns) {
        callback(err);
      });
    });

  });

};
