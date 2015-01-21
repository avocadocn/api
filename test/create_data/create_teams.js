'use strict';

var chance = require('./chance.js');
var common = require('../support/common');
var mongoose = common.mongoose;
var CompanyGroup = mongoose.model('CompanyGroup');


/**
 * 为公司生成小队
 * 生成至少4个小队，t0为类型A，t1~t3为类型B
 * @param {Object} company
 * @param {Function} callback 形式为function(err, teams){}
 */
var createTeams = function(company, callback) {
  var teams = [];
  var _teams = [];
  // The number of teams that you want to create
  var num = 6;

  for (var i = 0; i < num; i++) {
    chance.generateTeamData(function(err, result) {
      if (i == 0) {
        result.gid = 3;
        result.group_type = '阅读';
        result.entity_type = 'Reading';
      }
      if (i >= 1 && i <= 3) {
        result.gid = 7;
        result.group_type = '足球';
        result.entity_type = 'FootBall';
      }
      var team = new CompanyGroup({
        cid: company._id,
        gid: result.gid,
        poster: {
          role: 'HR'
        },
        group_type: result.group_type,
        cname: company.name,
        name: result.name,
        entity_type: result.entity_type,
        brief: result.brief,
        city: {
          province: company.info.city.province,
          city: company.info.city.city,
          district: company.info.city.district
        }
      });
      
      // Insert the company data to MongoDB
      team.save(function(err) {
      });
      
      var _team = {
        gid : team.gid,
        group_type: team.group_type,
        name: team.name,
        id: team._id,
      };

      teams.push(team);
      _teams.push(_team);

    });
  }
  company.team = _teams;
  company.save(function(err){

  });

  callback(null, teams);

};

module.exports = createTeams;