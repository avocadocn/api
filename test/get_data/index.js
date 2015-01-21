var common = require('../support/common.js');

var mongoose = common.mongoose;
var async = require('async');


/**
 * 用于测试断言的数据
 * 数据结构如下：
 *  data: {
 *    companies: [{
 *      model: doc, // 通过mongoose.model('Company')查询得到的文档
 *      teams: [{
 *        model: doc, // 通过mongoose.model('Team')查询得到的文档
 *        campaigns: [doc] // 小队活动，通过mongoose.model('Campaign')查询得到的文档
 *        users: [doc], // 小队成员，通过mongoose.model('User')查询得到的文档
 *        leader: doc // 小队队长
 *      }],
 *      campaigns: [doc], // 公司活动，通过mongoose.model('Campaign')查询得到的文档
 *      users: [doc] // 公司成员，通过mongoose.model('User')查询得到的文档
 *    }]
 *    // 其它数据待补充
 *  }
 *
 * 数据说明（待定，未使用）：
 *  companies[0]有4个特殊的小队，teams[0]是类型A，teams[1]、teams[2]和teams[3]为类型B；
 *  users[0]为teams[0]的队长
 *  users[1]为teams[1]的队长
 *  users[2]为teams[2]和teams[3]的队长
 *  users[3]不是队长
 *  对于公司活动和小队内部活动:
 *  campaigns[0]: 即将开始，没有人参加的活动
 *  campaigns[1]: 即将开始，有人参加的活动
 *  campaigns[2]: 正在进行的活动的活动
 *  campaigns[3]: 已结束的活动
 *  campaigns[4]: 已关闭的活动
 *  小队挑战:
 *  teams[1]:
 *    campaigns[5]: teams[1]对teams[2]发起的挑战，未应战
 *    campaigns[6]: teams[1]对teams[2]发起的挑战，已被接受，未开始
 *    campaigns[7]: teams[1]对teams[2]发起的挑战，被拒绝
 *  teams[2]:
 *    campaigns[5]: teams[2]对teams[3]发起的挑战，未应战
 *
 *  companies[1]有1个小队，teams[0]为类型B，users[0]为teams[0]的队长
 *    teams[0]:
 *      campaigns[0]: ...
 *
 *  注：以下方法需要修改以获取符合上述要求的数据
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
 * 获取小队的几个成员
 * @param {Object} dataTeam data.companies[i].teams[j]
 * @param {Function} callback 形式为function(err, users)
 */
var getLeaderFromTeam = function (dataTeam, callback) {
  var leaderId;
  var team = dataTeam.model;
  if (team.leader && team.leader.length > 0) {
    leaderId = team.leader[0]._id;
  }
  if (!leaderId) {
    callback();
    return;
  }
  mongoose.model('User')
    .findOne({
      _id: leaderId
    })
    .exec()
    .then(function (user) {
      dataTeam.leader = user;
      callback(null, user);
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

              // 获取每个小队的成员、队长、活动数据
              async.parallel({
                users: function (teamParallelCallback) {
                  getUsersFromTeam(team, limitConfig.user, teamParallelCallback);
                },
                leader: function (teamParallelCallback) {
                  getLeaderFromTeam(team, teamParallelCallback);
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
module.exports = function () {
  return data;
};
