'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RichComment = new Schema({
  owner: {
    companies: [Schema.Types.ObjectId],
    teams: [Schema.Types.ObjectId]
  },
  host_type: {
    type: String,
    enum: ['campaign', 'photo']
  },
  host_id: Schema.Types.ObjectId,
  photo_album_id: Schema.Types.ObjectId,
  enable: {
    type: Boolean,
    default: true
  }
});

RichComment.statics = {

  /**
   * 创建组件并初始化数据
   * @param {Object} host 评论对象
   * @param {Function} callback 创建成功后的回调函数，形式为callback(err, richComment)。创建成功是指保存至数据库成功。
   */
  establish: function (host, callback) {
    var modelName = host.constructor.modelName;
    var hostType;
    switch (modelName) {
      case 'Campaign':
        hostType = 'campaign';
        var owner = {
          companies: host.cid,
          teams: host.tid
        };
        break;
      case 'PhotoAlbum':
        hostType = 'photo';
        var owner = {
          companies: host.populated('companies') || host.companies,
          teams: host.populated('teams') || host.teams
        };
        break;
      default:
        return callback('不允许评论该对象');
    }
    var richComment = new this({
      owner: owner,
      host_type: hostType,
      host_id: host._id,
      photo_album_id: host.populated('photo_album') || host.photo_album
    });

    richComment.save(function (err) {
      if (err) { return callback(err); }
      else { callback (null, richComment); }
    });
  }
};

RichComment.methods = {

  /**
   * 获取该组件的初始数据, 用于前端directive初始化
   * @param {Object} user req.user
   * @param callback callback(data)
   */
  getData: function (user, callback) {
    callback({
      hostType: this.host_type,
      hostId: this.host_id,
      photoAlbumId: this.photo_album_id,
      userPhoto: user.photo
    });
  }

};

mongoose.model('RichComment', RichComment);