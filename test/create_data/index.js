'use strict';

var common = require('../api/common');
var mongoose = common.mongoose;

var async = require('async');

var createCompanies = require('./create_companies.js');
var createTeams = require('./create_teams.js');
var createUsers = require('./create_users.js');
var addUsersToTeams = require('./add_users_to_teams.js');
var createCompanyCampaigns = require('./create_company_campaigns.js');
var createTeamCampaigns = require('./create_team_campaigns.js');
var createInnerProvokes = require('./create_inner_provokes.js');
var createCompanyProvokes = require('./create_company_provokes.js');
var addUsersToCampaigns = require('./add_users_to_campaigns.js');


/**
 * 生成测试数据
 * @param {Function} callback 完成后的回调函数，形式为function(err){}
 */
module.exports = function (callback) {

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
              waterfallCallback(err, {
                teams: data.teams,
                users: data.users
              });
            });

          });
        }
      ], function (err, result) {
        // mapCallback 公司及小队数据，以便生成跨公司挑战
        mapCallback(err, {
          company: company,
          teams: result.teams,
          users: result.users
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
