'use strict';
var async = require('async');

/**
 * 让公司部分员工加入小队
 * example:
 *  var companyData = {
 *    model: doc,
 *    teams: [{
 *      model: doc,
 *      campaigns: [],
 *      users: [],
 *      leaders: []
 *    }],
 *    users: [doc]
 *  }
 *  addUsersToTeams(companyData, function(err) {
 *    //companyData: {
 *    //  model: doc,
 *    //  teams: [{
 *    //    model: doc,
 *    //    campaigns: [],
 *    //    users: [doc],
 *    //    leaders: [doc]
 *    //  }],
 *    //  users: [doc]
 *    //}
 *  });
 *
 * @param {Object} companyData 公司数据
 * @param {Function} callback 执行完后的回调函数
 */
var addUsersToGroups = function (companyData, callback) {
  /**
   * 现只考虑正常user, 其余非正常user暂不考虑。
   * 现有5个人参加6个群组
   * 
   * A为群组1,4的群主, 群组2的成员；
   * B为群组2的群主,群组1的管理员;
   * C为群组3、5、6的群主;
   * D是群组1、4的成员;
   * E不参加任何群组
   * 
   * 0表示未参加某队，1表示为队员，2表示为队长
   */
  var relationship = [[2,1,0,2,0,0],[3,2,0,0,0,0],[0,0,2,0,2,2],[1,0,0,1,0,0],[0,0,0,0,0,0]];//假定数据初始化

  var userLength = companyData.users.length;
  var teamLength = companyData.teams.length;
  // for(var i =companyData.users.length; i>3; i--) {//其他人数据初始化
  //   relationship[i]=[];
  //   for(var j = 0; j<teamLength; j++){
  //     relationship[i].push(random0or1());
  //   }
  // }
  // //-relationship初始化完成

  //根据relationship修改user、teams
  for (var i = 0; i < userLength; i++) {
    if (!relationship[i]) relationship[i] = [];
    for (var j = 0; j < teamLength; j++) {
      if (relationship[i][j] && relationship[i][j] > 0) {
        //修改users
        companyData.users[i].team.push({
          _id: companyData.teams[j].model._id,
          leader: relationship[i][j] === 2,
          public: companyData.teams[j].model.open
        });

        //修改team的model
        var member = {
          _id: companyData.users[i]._id,
          nickname: companyData.users[i].nickname,
          photo: companyData.users[i].photo
        };

        companyData.teams[j].model.member.push(member);
        //修改team的model外的users
        // companyData.teams[j].users.push(companyData.users[i]);
        // 不能在这里push进去，因为users还未更新完。只能for循环两次了...
        if (relationship[i][j] === 2) {
          //修改team的model
          companyData.teams[j].model.leader = {
            _id: companyData.users[i]._id,
            nickname: companyData.users[i].nickname,
            photo: companyData.users[i].photo
          };
          //修改team的model外的leaders
          // companyData.teams[j].leaders.push(companyData.users[i]);
          // 不能在这里push进去，因为users还未更新完。只能for循环两次了...
        }
      }
    }
  }

  for(var i=0; i<userLength; i++) {
    for(var j=0; j<teamLength; j++) {
      if(relationship[i][j]&&relationship[i][j]>0) {
        companyData.teams[j].users.push(companyData.users[i]);
        if(relationship[i][j]===2) {
          companyData.teams[j].leaders.push(companyData.users[i]);
        }
      }
    }
  }

  async.parallel({
    saveUsers: function (parallelCallback) {
      async.map(companyData.users, function (user, mapCallback) {
        user.save(mapCallback);
      }, function (err, results) {
        parallelCallback(err);
      });
    },
    saveTeams: function (parallelCallback) {
      var teams = [];
      companyData.teams.forEach(function (team) {
        teams.push(team.model);
      });
      async.map(teams, function (team, mapCallback) {
        team.save(mapCallback);
      }, function (err, results) {
        parallelCallback(err);
      });
    }
  }, function (err, results) {
    callback(err);
  });
};

module.exports = addUsersToGroups;