'use strict';

var common = require('./common');
var mongoose = common.mongoose;

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
 * 生成测试数据
 * @param {Function} callback 完成后的回调函数，形式为function(err){}
 */
exports.createData = function (callback) {
  // todo
};

