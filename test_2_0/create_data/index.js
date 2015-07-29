'use strict';

var util = require('util');

var common = require('../support/common');
var mongoose = common.mongoose;
var schedule = require('../../services/schedule.js');
var async = require('async');

var createCompanies = require('./create_companies.js');
var createUsers = require('./create_users.js');
var addUsersToGroups = require('./add_users_to_groups.js');
var createGifts = require('./create_gifts.js');

var createConfig = require('./create_config.js');
var createRegion = require('./create_region.js');
var createGroups = require('./create_groups.js');
var createInteractionTemplates = require('./create_interaction_templates.js');
var createInteractions = require('./create_interactions.js');
var createInteractionComments = require('./create_interaction_comments.js');
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
 *      chats: [doc] // mongoose.model('Chat')
 *    }],
 *    users: [doc], // mongoose.model('User')
 *    circles: [
 *                {
 *                  content: //mongoose.model('CircleContent')
 *                  comments: [doc] // mongoose.model('CircleComment')
 *                }
 *              ],
 *    
 *     
 *  }]
 * @type {Array}
 */
var resCompanyDataList = [];

/**
 * 配置数据，mongoose.model('Config')的文档
 */
var resConfig;
var resRegion;
var resGroups;
var resTemplate;
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
        activities: [],
        questions: [],
        polls: [],
        circles: []
      };
      resCompanyDataList.push(resCompanyData);

      async.waterfall([
        function (waterfallCallback) {
          // 生成小队、用户数据
          async.parallel({
            teams: function (parallelCallback) {
              // 生成小队数据
              console.log('开始生成小队数据');
              createGroups(company, parallelCallback);
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
                activities: [],
                questions: [],
                polls: []
              });
            });
            resCompanyData.users = results.users;
            waterfallCallback();
          });
        },
        function (waterfallCallback) {
          // 用户加入小队
          console.log('让公司的用户加入小队');
          addUsersToGroups(resCompanyData, waterfallCallback);
        },
        function (waterfallCallback) {
          console.log('加入互动模板成功');
          console.log('开始生成互动');
          createInteractions(resCompanyData, resTemplate, waterfallCallback);
        },
        // function (waterfallCallback) {
        //   console.log('生成互动成功');
        //   console.log('开始生成评论');
        //   waterfallCallback();
        //   // createInteractionComments(resCompanyData, waterfallCallback);
        // },
        // function (waterfallCallback) {
        //   console.log('生成评论成功');
        //   console.log('开始生成礼物');
        //   createGifts(resCompanyData, waterfallCallback);
        // }
      ], function (err, result) {
        if (err) {
          console.error('生成公司', company.info.name, '的数据失败');
          mapCallback(err);
          return;
        }
        // mapCallback 公司及小队数据
        console.log('成功生成公司', company.info.name, '的数据');
        mapCallback(null, resCompanyData);
      });
    }, function (err, results) {
      if (err) {
        console.error('生成公司数据失败');
        callback(err);
        return;
      }
      resCompanyDataList = results;
      // console.log(resCompanyDataList);
      console.log('成功生成所有测试数据');
      callback();
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

exports.createTemplate = function(callback){
  createInteractionTemplates(function(error,templates) {
    resTemplate= templates;
    callback(error)
  });
}
exports.getConfig = function () {
  return resConfig;
};

exports.getRegion = function () {
  return resRegion;
};



