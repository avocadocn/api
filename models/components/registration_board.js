'use strict';

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var _member = new Schema({
    _id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    nickname: String,
    photo: String,
    registration_time:{
        type: Date,
        default: Date.now
    }
});
var RegistrationBoard = new Schema({
  owner: {
    companies: [Schema.Types.ObjectId],
    teams: [Schema.Types.ObjectId]
  },
  host_type: {
    type: String,
    enum: ['campaign']
  },
  host_id: Schema.Types.ObjectId,
  logs: [_member],
  create_date: {
    type: Date,
    default: Date.now
  }
});
RegistrationBoard.statics = {

  /**
   * 创建组件
   * @param {Object} host 目前只允许是活动
   * @param {Function} callback callback(err, RegistrationBoard)
   */
  establish: function (host, callback) {
    var modelName = host.constructor.modelName;
    var playingTeams = [];
    switch (modelName) {
      case 'Campaign':
        var owner = {
          companies: host.cid,
          teams: host.tid
        };

        var host_type = 'campaign';
        var host_id = host._id;
        break;
      default:
        return callback('签到板只允许在活动中使用');
    }
    var RegistrationBoard = new this({
      owner: owner,
      host_type: host_type,
      host_id: host_id,
    });

    RegistrationBoard.save(function (err) {
      if (err) { return callback(err); }
      else { callback (null, RegistrationBoard); }
    });
  }
};


mongoose.model('RegistrationBoard', RegistrationBoard);