'use strict';

/**
 * 创建跨公司的挑战，并让部分成员参加挑战
 * example:
 *  createCompanyProvokes([{
 *    company: mongoose.model('Company'),
 *    teams: [mongoose.model('CompanyGroup')],
 *    users: [mongoose.model('User')]
 *  }], function (err, campaigns){})
 * @param {Array} companyDataList 公司数据
 * @param {Function} callback 形式为function(err, campaigns){}
 */
var createCompanyProvokes = function (companyDataList, callback) {
  // todo
};

module.exports = createCompanyProvokes;