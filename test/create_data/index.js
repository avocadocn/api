'use strict';

var common = require('../api/common');
var mongoose = common.mongoose;

var async = require('async');

var createCompanies = require('./create_companies.js');
var createTeams = require('./create_teams.js');
var createUsers = require('./create_users.js');
var addUsersToTeams = require('./add_users_to_teams.js');
var createCampaigns = require('./create_campaigns.js');

/**
 * 生成测试数据
 * @param {Function} callback 完成后的回调函数，形式为function(err, companyDataList){}
 */
module.exports = function (callback) {

  var resCompanyDataList = [];

  createCompanies(function (err, companies) {
    // 为每个公司生成小队、用户、活动等数据
    async.map(companies, function (company, mapCallback) {

      var resCompanyData = {
        model: company,
        teams: [],
        users: [],
        campaigns: []
      };
      resCompanyDataList.push(resCompanyData);

      async.waterfall([
        function (waterfallCallback) {
          // 生成小队、用户数据
          async.parallel({
            teams: function (parallelCallback) {
              // 生成小队数据
              createTeams(company, parallelCallback);
            },
            users: function (parallelCallback) {
              // 生成用户数据
              createUsers(company, parallelCallback);
            }
          }, function (err, results) {

            

            // 将小队和用户数据往下传递
            waterfallCallback(err, {
              teams: results.teams,
              users: results.users
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
          // 生成除跨公司挑战外的活动并让部分成员加入
          createCampaigns(companyData, function (err, companyData) {
            waterfallCallback(err, companyData);
          });
        }
      ], function (err, result) {
        // mapCallback 公司及小队数据，以便生成跨公司挑战
        mapCallback(err, result);
      });
    }, function (err, results) {
      // 生成跨公司的挑战数据
      createCompanyProvokes(results, function (err, companyDataList) {
        callback(err, companyDataList);
      });
    });

  });

};
