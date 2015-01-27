'use strict';
var async = require('async');
var chance = require('chance').Chance();

var common = require('../support/common');
var mongoose = common.mongoose;
var CompanyGroup = mongoose.model('CompanyGroup');

/**
 * 创建小队全家福照片
 * example:
 *  createFamilyPhotos({
 *    model: doc,
 *    teams: [
 *      model: doc,
 *      ...
 *    ],
 *    users: [doc],
 *    campaigns: [doc]
 *  }, function (err) {})
 * @param {Object} companyData
 * @param {Function} callback
 */
var createFamilyPhotos = function (companyData, callback) {

  async.map(companyData.teams, function (teamData, mapCallback) {

    var team = teamData.model;
    var leader = teamData.leaders[0];
    var uploadUser;
    if (leader) {
      uploadUser = {
        _id: leader._id,
        name: leader.nickname,
        photo: leader.photo
      };
    } else {
      uploadUser = {
        _id: companyData.model._id,
        name: companyData.model.info.name,
        photo: companyData.model.info.logo
      };
    }

    team.family = [];
    for (var i = 0; i < 5; i++) {
      team.family.push({
        uri: 'testFamilyUri',
        upload_user: uploadUser
      });
    }

    team.save(mapCallback);

  }, function (err, results) {
    callback(err);
  });

};

module.exports = createFamilyPhotos;