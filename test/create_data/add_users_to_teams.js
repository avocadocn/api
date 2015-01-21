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
var addUsersToTeams = function (companyData, callback) {
  /**
   * 假设有四个人(传入多少人无所谓，只要>=4,剩下的都随机)，参加三个队(传入多少队无所谓)
   * A成为队1的队长，队2的队员；B成为队1的队员；C为队2的队长；D不参加任何队；其他人随机(都不是队长，为了不重复为队长)
   * 先做一个3*5的二维数组来做随机,0表示未参加某队，1表示为队员，2表示为队长，示例 A：[2,1,0]
   */

  var relationship = [[2,1,0],[1,0,0],[0,2,0],[0,0,0]];//假定数据初始化
  var random0or1 = function() {//随机出0或1
    return Math.floor(Math.random()*2);
  };
  var userLength = companyData.users.length;
  var teamLength = companyData.teams.length;
  for(var i =companyData.users.length; i<userLength; i++) {//其他人数据初始化
    relationship[i]=[];
    for(var j = 0; j<teamLength; j++){
      relationship[i].push(random0or1());
    }
  }
  //-relationship初始化完成

  //根据relationship修改user、teams
  for(var i=0; i<userLength; i++) {
    for(var j=0; j<teamLength; j++) {
      if(relationship[i][j]&&relationship[i][j]>0) {
        companyData.users[i].team.push({
          gid : companyData.teams[j].gid,
          _id : companyData.teams[j]._id,
          group_type : companyData.teams[j].group_type,
          entity_type : companyData.teams[j].entity_type,
          name : companyData.teams[j].name,
          leader : relationship[i][j]===2,
          logo : companyData.teams[j].logo
        });
        if(relationship[i][j]===2) users[i].role = 'LEADER';
        var member =  {
          _id : companyData.users[i]._id,
          nickname: companyData.users[i].nickname,
          photo: companyData.users[i].photo
        };
        companyData.teams[j].member.push(member);
        if(relationship[i][j]===2) {
          companyData.teams[j].leader.push(member);
        }
      }
    }
    companyData.users[i].save(function(err) {
      if(err) {
        console.log(err);
      }
    });
  }
  for(var k =0; k<teamLength; k++) {
    companyData.teams[k].save(function(err) {
      if(err) {
        console.log(err);
      }
    });
  }
  callback();
};

module.exports = addUsersToTeams;