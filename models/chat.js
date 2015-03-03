//聊天数据结构

'use strict';

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var Chat = new Schema({
  chatroom_id: Schema.Types.ObjectId,  //聊天室的id,这个主体可以是 一个小队、一个公司
  content: String,
  create_date:{
    type:Date,
    default: Date.now
  },
  //发评论者id
  poster:{
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status:{
    type: String,
    enum:['active','delete','shield'],
    default: 'active'
  },
  
  photos: [{
    // _id: Schema.Types.ObjectId,
    uri: String,
    width: Number,
    height: Number,
    ori_uri: String
    // upload_user: {
    //   _id: Schema.Types.ObjectId,
    //   name: String,
    //   type: {
    //     type: String,
    //     enum: ['user', 'hr']
    //   }
    // },
    // upload_date: {
    //   type: Date,
    //   default: Date.now
    // }
  }]
});

// Comment.statics = {
//   /**
//    * 获取评论内容
//    * @param {Object} hostData
//    * @param {Date} pageStartDate 该页第一个评论的createDate
//    * @param {Function} callback callback(err, comments, nextStartDate)
//    */
//   getComments: function (hostData, pageStartDate, num, callback) {
//     var pageSize = 20;
//     var hostType = hostData.hostType;
//     if(num){
//       pageSize = parseInt(num);
//     }
//     // 兼容旧的数据, 现在只有campaign
//     if (hostData.hostType === 'campaign_detail' || hostData.hostType === 'campaign') {
//       hostType = { '$in': ['campaign', 'campaign_detail'] };
//     }
//     this.find({
//       host_type: hostType,
//       host_id: hostData.hostId,
//       status: { '$ne': 'delete' },
//       create_date: {
//         '$lte': pageStartDate || Date.now()
//       }
//     })
//       .limit(pageSize + 1)
//       .sort('-create_date')
//       .exec()
//       .then(function (comments) {
//         if (comments.length === pageSize + 1) {
//           var nextComment = comments.pop();
//           callback(null, comments, nextComment.create_date);
//         } else {
//           callback(null, comments);
//         }
//       })
//       .then(null, function (err) {
//         callback(err);
//       });
//   }
// };


mongoose.model('Chat', Chat);