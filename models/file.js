/**
 * 文件数据模型，保存上传文件的基本信息
 * CahaVar <cahavar@55yali.com> 于2015-03-17创建
 */

var mongoose = require('mongoose'),
  Schema = mongoose.Schema;

var File = new Schema({
  // 原文件名（上传的文件的原文件名，上传后会被重命名保存在服务器，保存此原文件名是为了应对可能的需求）
  originName: {
    type: String,
    required: true
  },

  // 文件名（实际保存在服务器上的文件名）
  name: {
    type: String,
    required: true
  },

  // 文件系统中相对yali网站目录的路径，如'/backup/2015/03/test.png'表示'yaliPath/backup/2015/03/test.png'
  path: {
    type: String,
    required: true
  },

  // 文件上传日期
  upload_date: {
    type: Date,
    required: true,
    default: Date.now
  },

  // 文件上传者
  uploader: {
    // 上传者_id
    _id: {
      type: Schema.Types.ObjectId,
      required: true
    },

    // 上传者的类型
    kind: {
      type: String,
      enum: ['user', 'company'],
      required: true
    },

    // 上传者的公司id
    cid: {
      type: Schema.Types.ObjectId,
      required: true
    }
  },

  // 文件所属的模型
  owner: {
    // mongoose模型的名字
    kind: {
      type: String,
      required: true
    },

    // 对应模型的_id
    _id: {
      type: Schema.Types.ObjectId,
      required: true
    }
  },

  // 文件的状态
  status: {
    type: String,
    required: true,
    enum: ['normal', 'delete'], // normal: 正常, delete: 删除（只是标记，文件仍存在）
    default: 'normal'
  }

});

mongoose.model('File', File);