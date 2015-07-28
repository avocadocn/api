'use strict';

var Chance = require('chance');
var common = require('../support/common');
var mongoose = common.mongoose;
var Team = mongoose.model('Team');
var async = require('async');

/**
 * 为公司生成群组
 * 生成至少4个群组
 * 群组序号     公开    需验证
 *    0       true     true 
 *    1       true     false
 *    2       false    true
 *    3       false    false
 *    4       true     false
 *    5       false    false
 * @param {Object} company
 * @param {Function} callback 形式为function(err, groups){}
 */
var createGroups = function(company, callback) {
  var chance = new Chance();
  //未激活的公司不需要加群组，被关闭的仍然加。
  if(!company.status.mail_active)
    callback(null,[]);
  else{
    var groups = [];
    var _groups = [];
    // The number of groups that you want to create
    var num = 6;
    var openArr = [true, true, false, false, true, false];
    var validateArr = [true, false, true, false, false, false];

    for (var i = 0; i < num; i++) {
      var group = new Team({
        cid: company._id, // 公司id
        cname: company.cname, // 公司名称
        name: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),// 群组名称
        logo: chance.string({pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'}),// 群组封面
        themeColor: chance.color(), // 群组主题颜色
        open: openArr[i], // 群组是否公开
        hasValidate: validateArr[i] // 群组是否需要验证
      });

      groups.push(group);

      _groups.push(group._id);
    }

    company.team = _groups;

    async.parallel({
      saveGroups: function (parallelCallback) {
        async.map(groups, function (group, mapCallback) {
          group.save(mapCallback);
        }, function (err, results) {
          parallelCallback(err);
        });
      },
      saveCompany: function (parallelCallback) {
        company.save(parallelCallback);
      }
    }, function (err, results) {
      callback(err, groups);
    });
  }
};

module.exports = createGroups;