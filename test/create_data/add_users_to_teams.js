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
  for(var i =companyData.users.length; i>3; i--) {//其他人数据初始化
    relationship[i]=[];
    for(var j = 0; j<teamLength; j++){
      relationship[i].push(random0or1());
    }
  }
  //-relationship初始化完成

  //根据relationship修改user、teams
  for(var i=0; i<userLength; i++) {
    if(!relationship[i]) relationship[i]=[];
    for(var j=0; j<teamLength; j++) {
      if(relationship[i][j]&&relationship[i][j]>0) {
        //修改users
        companyData.users[i].team.push({
          gid : companyData.teams[j].model.gid,
          _id : companyData.teams[j].model._id,
          group_type : companyData.teams[j].model.group_type,
          entity_type : companyData.teams[j].model.entity_type,
          name : companyData.teams[j].model.name,
          leader : relationship[i][j]===2,
          logo : companyData.teams[j].model.logo
        });
        if(relationship[i][j]===2) companyData.users[i].role = 'LEADER';
        //修改team的model
        var member =  {
          _id : companyData.users[i]._id,
          nickname: companyData.users[i].nickname,
          photo: companyData.users[i].photo
        };
        companyData.teams[j].model.member.push(member);
        //修改team的model外的users
        // companyData.teams[j].users.push(companyData.users[i]);
        // 不能在这里push进去，因为users还未更新完。只能for循环两次了...
        if(relationship[i][j]===2) {
          //修改team的model
          companyData.teams[j].model.leader.push(member);
          //修改team的model外的leaders
          // companyData.teams[j].leaders.push(companyData.users[i]);
          // 不能在这里push进去，因为users还未更新完。只能for循环两次了...
        }
      }
    }
    companyData.users[i].save(function(err) {
      if(err) {
        console.log(err);
      }
    });
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
  console.log(companyData.teams);

  for(var k =0; k<teamLength; k++) {
    companyData.teams[k].model.save(function(err) {
      if(err) {
        console.log(err);
      }
    });
  }
  callback();
};

module.exports = addUsersToTeams;