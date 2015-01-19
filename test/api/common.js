var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
var async = require('async');

var config = require(path.join(__dirname, '../../config/config.js'));
mongoose.createConnection(config.db);

var walk = function(path, callback) {
  fs.readdirSync(path).forEach(function(file) {
    var newPath = path + '/' + file;
    var stat = fs.statSync(newPath);
    if (stat.isFile()) {
      if (/(.*)\.(js$)/.test(file)) {
        if (callback) {
          callback(file, newPath)
        } else {
          require(newPath);
        }
      }
    } else if (stat.isDirectory()) {
      walk(newPath, callback);
    }
  });
};
// 初始化 mongoose models
walk(path.join(config.rootPath, 'models/'));

/**
 * 用于测试断言的数据
 * 数据结构如下：
 *  data: {
 *    companies: [{
 *      model: doc, // 通过mongoose.model('Company')查询得到的文档
 *      teams: [{
 *        model: doc, // 通过mongoose.model('Team')查询得到的文档
 *        campaigns: [doc] // 小队活动，通过mongoose.model('Campaign')查询得到的文档
 *        users: [doc] // 小队成员，通过mongoose.model('User')查询得到的文档
 *      }],
 *      campaigns: [doc], // 公司活动，通过mongoose.model('Campaign')查询得到的文档
 *      users: [doc] // 公司成员，通过mongoose.model('User')查询得到的文档
 *    }]
 *    // 其它数据待补充
 *  }
 */
var data = {};

var limitConfig = {
  company: 3, // 取3个公司用于测试断言
  team: 3, // 每个公司取3个小队
  user: 3, // 每个公司、每个小队取3个成员
  campaign: 3 // 每个公司、每个小队取3个活动
};


/**
 * 是否已经获取到数据
 * @type {boolean}
 */
var gotData = false;

/**
 * 从数据库中获取几个公司
 * @param {Number} 获取数量上限
 * @param {Function} callback function(err, companies),其中companies为data对象中的companies属性
 */
var getCompanies = function (limit, callback) {
  mongoose.model('Company').find({}).limit(limit).exec()
    .then(function (companies) {
      data.companies = [];
      companies.forEach(function (company) {
        data.companies.push({
          model: company,
          teams: [],
          users: [],
          campaigns: []
        });
      });
      callback(null, data.companies);
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 获取公司的几个小队
 * @param {Object} dataCompany data.companies的元素
 * @param {Number} limit 获取数量上限
 * @param {Function} callback 形式为function(err, teams),teams为data.companies.[i].teams
 */
var getTeamsFromCompany = function (dataCompany, limit, callback) {
  mongoose.model('CompanyGroup')
    .find({ cid: dataCompany.model._id })
    .limit(limit)
    .exec()
    .then(function (teams) {
      teams.forEach(function (team) {
        dataCompany.teams.push({
          model: team,
          campaigns: [],
          users: []
        });
      });
      callback(null, dataCompany.teams)
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 获取公司的几个成员
 * @param {Object} dataCompany data.companies的元素
 * @param {Number} limit 获取数量上限
 * @param {Function} callback 形式为function(err, users)
 */
var getUsersFromCompany = function (dataCompany, limit, callback) {
  mongoose.model('User')
    .find({ cid: dataCompany.model._id })
    .limit(limit)
    .exec()
    .then(function (users) {
      dataCompany.users = users;
      callback(null, users);
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 获取小队的几个成员
 * @param {Object} dataTeam data.companies[i].teams[j]
 * @param {Number} limit 获取数量上限
 * @param {Function} callback 形式为function(err, users)
 */
var getUsersFromTeam = function (dataTeam, limit, callback) {
  var memberIds = [];
  dataTeam.model.member.forEach(function (member) {
    memberIds.push(member._id);
  });
  mongoose.model('User')
    .find({
      _id: { $in: memberIds }
    })
    .limit(limit)
    .exec()
    .then(function (users) {
      dataTeam.users = users;
      callback(null, users);
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 获取公司的几个活动
 * @param {Object} dataCompany data.companies[i].teams[j]
 * @param {Number} limit 获取数量上限
 * @param {Function} callback 形式为function(err, campaigns)
 */
var getCampaignsFromCompany = function (dataCompany, limit, callback) {
  mongoose.model('Campaign')
    .find({
      cid: dataCompany.model._id
    })
    .limit(limit)
    .exec()
    .then(function (campaigns) {
      dataCompany.campaigns = campaigns;
      callback(null, campaigns);
    })
    .then(null, function (err) {
      callback(err);
    });
};

/**
 * 获取小队的几个活动
 * @param {Object} dataTeam data.companies[i].teams[j]
 * @param {Number} limit 获取数量上限
 * @param {Function} callback 形式为function(err, campaigns)
 */
var getCampaignsFromTeam = function (dataTeam, limit, callback) {
  mongoose.model('Campaign')
    .find({
      tid: dataTeam.model._id
    })
    .limit(limit)
    .exec()
    .then(function (campaigns) {
      dataTeam.campaigns = campaigns;
      callback(null, campaigns);
    })
    .then(null, function (err) {
      callback(err);
    });
};


/**
 * 从数据库获取数据并保存起来；如果已经获取过了，就不会再去获取
 * @param {Function} callback 形式为function(err)
 */
exports.getDataFromDB = function (callback) {
  if (gotData) {
    callback();
    return;
  }

  // 获取几个公司
  getCompanies(limitConfig.company, function (err, companies) {
    if (err) {
      callback(err);
      return;
    }

    async.map(companies, function (company, comMapCallback) {

      // 获取每个公司的小队、用户、活动数据
      async.parallel({
        teams: function (comParallelCallback) {
          getTeamsFromCompany(company, limitConfig.team, function (err, teams) {

            async.map(teams, function (team, teamMapCallback) {

              // 获取每个小队的成员、活动数据
              async.parallel({
                users: function (teamParallelCallback) {
                  getUsersFromTeam(team, limitConfig.user, teamParallelCallback);
                },
                campaigns: function (teamParallelCallback) {
                  getCampaignsFromTeam(team, limitConfig.campaign, teamParallelCallback)
                }
              }, function (err, results) {
                teamMapCallback(err);
              });

            }, function (err, results) {
              comParallelCallback(err);
            });

          });
        },
        users: function (comParallelCallback) {
          getUsersFromCompany(company, limitConfig.user, comParallelCallback);
        },
        campaigns: function (comParallelCallback) {
          getCampaignsFromCompany(company, limitConfig.campaign, comParallelCallback);
        }
      }, function (err, results) {
        comMapCallback(err);
      });

    }, function (err, results) {
      if (!err) {
        gotData = true;
      }
      callback(err);
    });

  });

};

/**
 * 获取已经从数据库获取到的数据
 * @returns {Object}
 */
exports.getData = function () {
  return data;
};

exports.mongoose = mongoose;

