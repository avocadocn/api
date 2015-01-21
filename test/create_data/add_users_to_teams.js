'use strict';
var async = require('async');
/**
 * 让公司的部分员工加入几个小队
 * @param {Array} users 公司的所有成员
 * @param {Array} teams 公司的小队列表
 * @param {Function} callback 形式为function(err){}
 */
var addUsersToTeams = function (users, teams, callback) {
  /**
   * 假设有四个人(传入多少人无所谓，只要>=4,剩下的都随机)，参加三个队(传入多少队无所谓)
   * A成为队1的队长，队2的队员；B成为队1的队员；C为队2的队长；D不参加任何队；其他人随机(都不是队长，为了不重复为队长)
   * 先做一个3*5的二维数组来做随机,0表示未参加某队，1表示为队员，2表示为队长，示例 A：[2,1,0]
   */

  var relationship = [[2,1,0],[1,0,0],[0,2,0],[0,0,0]];//假定数据初始化
  var random0or1 = function() {//随机出0或1
    return Math.floor(Math.random()*2);
  };
  var userLength = users.length;
  var teamLength = teams.length;
  for(var i =users.length; i<userLength; i++) {//其他人数据初始化
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
        users[i].team.push({
          gid : teams[j].gid,
          _id : teams[j]._id,
          group_type : teams[j].group_type,
          entity_type : teams[j].entity_type,
          name : teams[j].name,
          leader : relationship[i][j]===2,
          logo : teams[j].logo
        });
        if(relationship[i][j]===2) users[i].role = 'LEADER';
        var member =  {
          _id : users[i]._id,
          nickname: users[i].nickname,
          photo: users[i].photo
        };
        teams[j].member.push(member);
        if(relationship[i][j]===2) {
          teams[j].leader.push(member);
        }
      }
    }
    users[i].save(function(err) {
      if(err) {
        callback(err);
      }
    });
  }
  for(var k =0; k<teamLength; k++) {
    teams[k].save(function(err) {
      if(err) {
        callback(err);
      }
    });
  }
  callback();
};

module.exports = addUsersToTeams;