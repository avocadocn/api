'use strict';

var common = require('../support/common');
var mongoose = common.mongoose;
var async = require('async');
var User  = mongoose.model('User');
var Chance = require('chance');

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
 * 创建一个新成员
 * @param {Object} opts
 * @param {Function} callback 形式为funciton(err, user){}
 */
var createNewUser = function(opts, callback) {
  var chance = new Chance();
  var email =chance.email({domain: opts.domain});
  var user = new User({
    username: email,
    password: '55yali',
    email: email,
    active: true,
    mail_active: true,
    nickname: chance.string({length: 5}),
    realname: chance.string({length: 10}),
    introduce: chance.string({length: 30}),
    role: 'EMPLOYEE',
    cid: opts.cid,
    cname: opts.cname,
    company_official_name: opts.company_official_name
  });
  user.save(function(err) {
    if(err){
      callback(err)
      else{
        callback(null, user);
      }
    }
  });
}

/**
 * 创建公司的成员
 * @param {Object} company
 * @param {Function} callback 形式为function(err, users){}
 */
var createUsers = function (company, callback) {
  var i = 0;
  var users = [];
  var opts = {
    domain: company.email.domain,
    cid: company._id,
    cname: company.info.name,
    company_official_name: company.info.official_name
  };
  async.whilst(
    function() {return i<3},//生成3个人 需要时可调整
    function(cb) {
      createNewUser(opts, function(err, user) {
        i++;
        if(err){
          cb(err);
        }else{
          users.push(user);
          cb();
        }
      });
    },
    function(err) {
      if(err) {
        console.log(err);
      } else {
        callback(users);
      }
    }
  );
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
