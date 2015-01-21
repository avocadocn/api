'use strict';

var chance = require('./chance.js');

/**
 * 为公司生成小队
 * @param {Object} company
 * @param {Function} callback 形式为function(err, teams){}
 */
var createTeams = function(company, callback) {
  var teams = [];
  // The number of teams that you want to create
  var num = 10;
  for (var i = 0; i < company.length; i++) {
    for (var j = 0; j < num; j++) {
      chance.generateTeamData(function(err, result) {
        var team = new CompanyGroup({
          cid: company[i]._id,
          gid: result.gid,
          poster: {
            role: 'HR'
          },
          group_type: result.group_type,
          cname: company[i].name,
          name: result.name,
          entity_type: result.entity_type,
          brief: result.brief,
          city: {
            province: company[i].info.city.province,
            city: company[i].info.city.city,
            district: company[i].info.city.district
          }
        });

        // Insert the company data to MongoDB 
        team.save(function(err) {
          if (err) console.log(err);
          process.exit(0);
        });

        teams.push(team);
      });
    }
  }

  callback(null, teams);

};

module.exports = createTeams;