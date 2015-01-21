'use strict';

/**
 * 新建活动，并让成员加入，新建活动后在companyDataList添加相应属性
 *  example: createCampaigns([{
 *    model: doc,
 *    teams: [{
 *      model: doc,
 *      users: [doc],
 *      leaders: [doc]
 *    }], // 约定teams[0]为类型A，teams[1]~teams[3]为类型B
 *    users: [doc]
 *  }], function (err, companyDataList) {
 *    //companyDataList: [{
 *    //  model: doc,
 *    //  teams: [{
 *    //    model: doc,
 *    //    users: [doc],
 *    //    leaders: [doc],
 *    //    campaigns: [doc]
 *    //  }],
 *    //  users: [doc],
 *    //  campaigns: [doc]
 *    //}]
 *  });
 * @param {Array} companyDataList
 * @param callback
 */
var createCampaigns = function (companyDataList, callback) {

};

module.exports = createCampaigns;