'use strict';

var util = require('util');

var common = require('../support/common');
var mongoose = common.mongoose;

var async = require('async');

var createCompanies = require('./create_companies.js');
var createTeams = require('./create_teams.js');
var createUsers = require('./create_users.js');
var addUsersToTeams = require('./add_users_to_teams.js');
var createCampaigns = require('./create_campaigns.js');

var createConfig = require('./create_config.js');
var createRegion = require('./create_region.js');
var createCampaignMold = require('./create_mold.js');

var createPhotoAlbums = require('./create_photo_albums.js');

/**
 * 公司数据列表，保存公司及其员工、小队、活动数据
 *  [{
 *    model: doc, // mongoose.model('Company')
 *    teams: [{
 *      model: doc, // mongoose.model('Team')
 *      campaigns: [doc], // mongoose.model('Campaign')
 *      users: [doc], // mongoose.model('User')
 *      leaders: [doc], // mongoose.model('User')
 *      photoAlbums: [doc] // mongoose.model('PhotoAlbum')
 *    }],
 *    users: [doc], // mongoose.model('User')
 *    campaigns: [doc] // mongoose.model('Campaign')
 *  }]
 * @type {Array}
 */
var resCompanyDataList = [];

/**
 * 配置数据，mongoose.model('Config')的文档
 */
var resConfig;
var resRegion;
/**
 * 生成测试数据
 * @param {Function} callback 完成后的回调函数，形式为function(err){}
 */
exports.createData = function (callback) {

  console.log('开始创建公司');
  createCompanies(function (err, companies) {
    if (err) {
      console.error('创建公司数据失败');
      callback(err);
      return;
    }
    console.log('成功创建了', companies.length, '个公司');
    console.log('开始为每个公司生成小队、用户、活动等数据');
    // 为每个公司生成小队、用户、活动等数据
    async.map(companies, function (company, mapCallback) {
      console.log('开始生成公司', company.info.name, '的数据');
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
              console.log('开始生成小队数据');
              createTeams(company, parallelCallback);
            },
            users: function (parallelCallback) {
              // 生成用户数据
              console.log('开始生成用户数据');
              createUsers(company, parallelCallback);
            }
          }, function (err, results) {
            if (err) {
              console.log('生成小队或用户数据失败');
              callback(err);
              return;
            }
            console.log(util.format('成功生成%d个小队和%d个用户', results.teams.length, results.users.length));
            results.teams.forEach(function (team) {
              resCompanyData.teams.push({
                model: team,
                users: [],
                leaders: [],
                campaigns: []
              });
            });
            resCompanyData.users = results.users;
            waterfallCallback();
          });
        },
        function (waterfallCallback) {
          // 用户加入小队
          console.log('让公司的用户加入小队');
          addUsersToTeams(resCompanyData, waterfallCallback);
        },
        function (waterfallCallback) {
          // 创建小队相册, 这是个异步过程，但不影响后面创建和参加活动，所以使用回调获取结果，减少流程复杂度
          resCompanyData.teams.forEach(function (team) {
            createPhotoAlbums(team);
          });

          // 生成除跨公司挑战外的活动并让部分成员加入
          console.log('加入小队成功，开始生成除跨公司挑战外的活动');
          createCampaigns([resCompanyData], function (err, companyData) {
            waterfallCallback(err, companyData);
          });
        }
      ], function (err, result) {
        if (err) {
          console.error('生成公司', company.info.name, '的活动失败');
          callback(err);
          return;
        }
        // mapCallback 公司及小队数据，以便生成跨公司挑战
        console.log('成功生成公司', company.info.name, '的数据');
        mapCallback(null, result);
      });
    }, function (err, results) {
      if (err) {
        console.error('生成公司', company.info.name, '的数据失败');
        callback(err);
        return;
      }
      // 生成跨公司的挑战数据
      console.log('开始生成跨公司挑战的数据');
      createCampaigns(results, function (err, companyDataList) {
        if (err) {
          console.log('生成跨公司挑战数据失败');
          callback(err);
          return;
        }
        resCompanyDataList = companyDataList;
        console.log('成功生成所有测试数据');
        callback();
      });
    });

  });

};

exports.getData = function () {
  return resCompanyDataList;
};

/**
 * 创建配置数据
 * @param {Function} callback function(err){}
 */
exports.createConfig = function (callback) {
  createConfig(function (err, config) {
    if (err) {
      callback(err);
    } else {
      resConfig = config;
      callback();
    }
  });
};
/**
 * Generate Region Data
 * @param {Function} callback function(err){}
 */
exports.createRegion = function (callback) {
  createRegion(function (err, region) {
    if (err) {
      callback(err);
    } else {
      resRegion = region;
      callback();
    }
  });
};
exports.createCampaignMold = function (callback) {
  createCampaignMold(function (err) {
    if (err) {
      callback(err);
    } else {
      callback();
    }
  });
};
exports.getConfig = function () {
  return resConfig;
};

exports.getRegion = function () {
  return resRegion;
};
