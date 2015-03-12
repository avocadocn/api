//投票数据结构
'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var unit = {
  tid:Schema.Types.ObjectId,  //小队id
  positive: {                 //赞成人数
    type: Number,
    default: 0
  },
  positive_member: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]  //赞成者
};

var Vote = new Schema({

  host_id: Schema.Types.ObjectId, //主体id,如挑战信等
  host_type: {                    //主体类型
    type: String,
    enum: ['Campaign', 'CompetitionMessage'],
    default: 'CompetitionMessage'
  },
  units: [unit]

});

Vote.statics = {

  /**
   * 创建组件
   * @param {Object} host 目前只允许是活动
   * @param {Function} callback callback(err, Vote)
   */
  establish: function (host, callback) {
    var modelName = host.constructor.modelName;
    var playingTeams = [];
    var host_type = modelName;
    var host_id = host._id;
    var _units = [];
    switch (modelName) {
      case 'CompetitionMessage':
        _units.push({tid:host.sponsor_team});
        _units.push({tid:host.opposite_team});
        break;
      case 'Campaign':
        host.campaign_unit.forEach(function(_campaignUnit, index){
          _units.push({
            tid:_campaignUnit.team._id
          });
        });
        break;
      default:
        return callback('投票板无法在该主体中使用');
    }
    var Vote = new this({
      host_type: host_type,
      host_id: host_id,
      units: _units
    });

    Vote.save(function (err) {
      if (err) { return callback(err); }
      else { callback (null, Vote); }
    });
  }
};
mongoose.model('Vote', Vote);