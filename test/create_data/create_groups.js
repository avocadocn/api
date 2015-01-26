'use strict';

var common = require('../support/common.js');
var mongoose = common.mongoose;
var Group = mongoose.model('Group');

var _groups = [{
    '_id': '0',
    'group_type': '虚拟组',
    'entity_type': 'virtual',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '1',
    'group_type': '羽毛球',
    'entity_type': 'Badminton',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '2',
    'group_type': '篮球',
    'entity_type': 'BasketBall',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '3',
    'group_type': '阅读',
    'entity_type': 'Reading',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '4',
    'group_type': '自行车',
    'entity_type': 'Bicycle',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '5',
    'group_type': '台球',
    'entity_type': 'TableTennis',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '6',
    'group_type': '钓鱼',
    'entity_type': 'Fishing',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '7',
    'group_type': '足球',
    'entity_type': 'FootBall',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '8',
    'group_type': 'k歌',
    'entity_type': 'KTV',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '9',
    'group_type': '户外',
    'entity_type': 'OutDoor',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '10',
    'group_type': '乒乓球',
    'entity_type': 'PingPong',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '11',
    'group_type': '跑步',
    'entity_type': 'Running',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}, {
    '_id': '12',
    'group_type': '游泳',
    'entity_type': 'Swimming',
    'icon': 'default',
    'active': true,
    'group_rule': 'default'
}];

/**
 * Generate Groups Data
 * @param {Function} callback function(err, groups){}
 */
var createGroups = function(callback) {
  var groups = []; // groups array storage 
  _groups.forEach(function(_group) {
    var group = new Group({
      _id: _group._id,
      group_type: _group.group_type,
      entity_type: _group.entity_type,
      icon: _group.icon,
      active: _group.entity_type,
      group_rule: _group.group_rule
    });
    group.save(function(err) {
      if(err) console.log(err);
    });
    groups.push(group);
  });
  callback(null, groups);
};

module.exports = createGroups;