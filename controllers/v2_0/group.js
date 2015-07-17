'use strict';

var path = require('path'),
  fs = require('fs'),
  multiparty = require('multiparty');

var mongoose = require('mongoose');
var Groups = mongoose.model('Groups');
var User = mongoose.model('User');
var GroupInviteCode = mongoose.model('GroupInviteCode');

var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  uploader = require('../../services/uploader.js'),
  tools = require('../../tools/tools.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  async = require('async');

// TODO: 群组API涉及到权限判断，同时有重复代码，需要
// 修改原权限判断代码，优化代码。
module.exports = function(app) {
  return {
    /**
     * 验证创建群组的数据
     * 解析form数据，验证必需数据是否存在
     * 
     * @param req formData(multipart/form-data)
     */
    getFormDataForGroup: function(req, res, next) {
      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });

      form.parse(req, function(err, fields, files) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }

        donlerValidator({
          name: {
            name: '名称',
            value: fields['name'],
            validators: ['required']
          },
          themeColor: {
            name: '主题颜色',
            value: fields['themeColor'],
            validators: ['required']
          },
          logo: {
            name: '封面',
            value: fields[fieldName],
            validators: ['required']
          }
        }, 'complete', function(pass, msg) {
          if (pass) {
            req.groupInfo = {};

            req.groupInfo.name = fields['name'];
            req.groupInfo.themeColor = fields['themeColor'];
            req.groupLogoFile = files[fieldName];
            next();
          } else {
            var resMsg = donlerValidator.combineMsg(msg);
            res.status(400).send({
              msg: resMsg
            });
          }
        });
      });
    },
    /**
     * 上传群组的封面
     * 无form图片数据, 进行下一步；
     * 有form图片数据, 将图片从暂存区移动到指定存储区域, 返回图片相对路径等信息
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    uploadLogoForGroup: function(req, res, next) {
      if (!req.groupLogoFile) {
        // 不传照片的话直接到下一步
        next();
        return;
      }

      uploader.uploadImage(req.groupLogoFile, {
        targetDir: '/public/img/groups',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
        getSize: true,
        success: function(imgInfo, oriCallback) {
          req.groupInfo.logo = imgInfo.url;
          next();
        },
        error: function(err) {
          log(err);
          return res.status(500).send({
            msg: '服务器错误'
          });
        }
      });
    },
    /**
     * 创建群组
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    createGroup: function(req, res) {

      var group = new Groups({
        cid: req.user.cid, // 公司id

        cname: req.user.cname, // 公司名称

        name: req.groupInfo.name, // 群组名称

        logo: req.groupInfo.logo, // 群组封面

        themeColor: req.groupInfo.themeColor, // 群组主题颜色

        leader: { // 群组管理人员（队长）
          _id: req.user.id,
          nickname: req.user.nickname,
          photo: req.user.photo
        },
        // 群组成员
        member: [{
          _id: req.user.id,
          nickname: req.user.nickname,
          photo: req.user.photo
        }]
      });

      group.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '群组创建成功'
          });
        }
      });
    },
    /**
     * 获取群组
     * 根据群组的id获取群组的信息, 失败，返回500
     * 根据群组的id获取群组的信息, 若无相应群组数据，返回204, msg: 未找到该群组；否则，下一步
     *    
     */
    getGroupById: function(req, res) {
      Groups.findOne({
          '_id': req.params.groupId,
          'active': true
          // TODO(加入公司关闭属性)
        }).exec()
        .then(function(group) {
          if (!group) {
            return res.status(204).send({
              msg: '未找到该群组'
            });
          } else {
            req.group = group;
            next();
          }
        })
        .then(null, function(err) {
          return res.sendStatus(500);
        });
    },
    /**
     * 获取更新群组的数据
     * @param  {[type]}   req  [description]
     */
    getFormDataForUpdateGroup: function(req, res, next) {
      // 判断权限
      var users = [];
      users.push(req.group.leader._id);
      var role = auth.getRole(req.user, {
        users: users
      });
      var allow = auth.auth(role, ['updateGroup']);
      if (!allow.updateGroup) {
        return res.status(403).send({
          msg: '无权限'
        });
      }

      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });

      form.parse(req, function(err, fields, files) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        
        req.groupInfo = {};
        // 基本群组设置
        req.groupInfo.name = fields['name'];
        req.groupInfo.themeColor = fields['themeColor'];
        req.groupLogoFile = files[fieldName];
        // 额外群组设置
        req.groupInfo.brief = files['brief'];
        req.groupInfo.open = files['open'];
        req.groupInfo.validate = files['validate'];

        next();
      });
    },
    /**
     * 编辑群组
     * @param  @param req formData(multipart/form-data)
     *   
     */
    updateGroup: function(req, res) {
      var doc = {};
      for (o in req.groupInfo) {
        if (req.groupInfo[o] !== undefined) {
          doc[o] = req.groupInfo[o];
        }
      }

      Groups.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: doc
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            msg: '编辑群组成功'
          });
        }
      });
    },
    /**
     * app内群组邀请
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    inviteMemberToGroup: function(req, res) {
      // 判断权限
      // TODO: update auth code
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      }); // TODO: check it
      // if (isMember) {
      //   role.group = 'member';
      // }
      // var role = auth.getRole(req.user, {
      //   users: users
      // });
      // var allow = auth.auth(role, ['inviteMemberToGroup']);
      if (!isMember) {
        return res.status(403).send({
          msg: '无权限'
        });
      }
      // 判断该用户是否已经是该群组成员
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.body.invitedMemberId.toString()
      });

      if (isMember) {
        return res.status(400).send({
          msg: '用户已经加入该群组'
        });
      }
      // 判断该该用户是否已被邀请
      var isInvited = req.inviteMember.some(function(inviteMember) {
        return inviteMember.inviteMemberId.toString() === req.params.userId.toString()
      });

      if (isInvited) {
        return res.status(400).send({
          msg: '用户已邀请'
        });
      }
      // TODO: findById -> findOne 判断用户是否存在
      User.findById(req.params.userId, function(err, user) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        if (!user) {
          return res.status(400).send({
            msg: '受邀用户不存在'
          });
        } else {
          // 将邀请记录加入inviteMember
          Groups.update({
            '_id': req.group._id,
            'active': true
          }, {
            $addToSet: {
              'inviteMember': {
                inviteMemberId: req.params.userId, //被邀请人id
                _id: req.user._id, //邀请人id
              }
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
              return res.sendStatus(500);
            }
            // TODO:
            // 更新用户邀请列表
            // 邀请列表包括 邀请人、邀请加入的群组等信息

            return res.status(200).send({
              msg: '邀请成功'
            });
          });
        }
      });
    },
    /**
     * app外群组邀请(邀请链接)
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getInviteCodeForGroup: function(req, res) {
      // 判断权限
      // TODO: update auth code
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      }); // TODO: check it
      // if (isMember) {
      //   role.group = 'member';
      // }
      // var role = auth.getRole(req.user, {
      //   users: users
      // });
      // var allow = auth.auth(role, ['inviteMemberToGroup']);
      if (!isMember) {
        return res.status(403).send({
          msg: '无权限'
        });
      }

      // TODO 修改邀请链接网址生成
      // uuid or guid
      var inviteCode = crypto.createHash('md5').update(Date.now().valueOf().toString()).digest('hex');

      var groupInviteCode = new GroupInviteCode({
        code: inviteCode, // 公司id

        groupId: req.group._id, // 公司名称

        user: {
          _id: req.user._id,
          nickname: req.user.nickname,
          photo: req.user.photo
        }
      });

      groupInviteCode.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            inviteCode: inviteCode
          });
        }
      });
    },
    /**
     * 加入群组
     * 请求用户已经加入该群组, 则返回400, msg: 用户已经加入该群组
     * 该群组为需验证身份群组
     *    请求用户已经申请加入该群组, 则返回400, msg: 用户已经申请该群组
     *    请求用户为申请加入该群组, 则将该请求用户加入申请成员列表, 返回200, msg: 申请加入该群组成功
     * 该群组为非验证身份群组
     *    请求用户加入该群组, 返回200, msg: 加入群组成功
     * @param  req 
     * group {
     *         ....
     *         validate: Boolean
     *         ....
     *       }
     * 如果group.validate的值为true, 那么用户加入群组需要验证信息;否则，直接加入群组。
     * 
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    joinGroup: function(req, res) {
      // 判断该用户是否已经是该群组成员
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      });

      if (isMember) {
        return res.status(400).send({
          msg: '用户已经加入该群组'
        });
      }

      if(req.group.validate) {
        var hasApply = applyMember.some(function(member) {
          return member._id.toString() === req.user._id.toString()
        });

        if (hasApply) {
          return res.status(400).send({
            msg: '用户已经申请该群组'
          });
        }

        Groups.update({
          '_id': req.group._id,
          'active': true
        }, {
          $addToSet: {
            'applyMember': {
              _id: req.user._id, // 成员id
              nickname: req.user.nickname, // 成员昵称
              photo: req.user.photo, // 成员头像
            }
          }
        }, function(err, numberAffected) {
          if (err) {
            log(err);
            return res.sendStatus(500);
          } else {
            return res.status(200).send({
              msg: '申请加入该群组成功'
            });
          }
        });
      } else {
        Groups.update({
          '_id': req.group._id,
          'active': true
        }, {
          $addToSet: {
            'member': {
              _id: req.user._id, // 成员id
              nickname: req.user.nickname, // 成员昵称
              photo: req.user.photo, // 成员头像
            }
          }
        }, function(err, numberAffected) {
          if (err) {
            log(err);
            return res.sendStatus(500);
          } else {
            return res.status(200).send({
              msg: '加入群组成功'
            });
          }
        });
      }
    },
    /**
     * 退出群组
     * 用户未参加该群组，则返回错误请求400
     * 用户参加该群组并且不是群主，则返回200, msg: 退出群组成功
     * 用户参加该群组并且是群组：
     *     群组成员只有群主, 则返回200, msg: 没有成员，群组会删除
     *     群组有多个成员, 则返回200, msg: 指定新群主
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    quitGroup: function(req, res) {
      // 判断该用户是否已经是该群组成员
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      });

      if (!isMember) {
        return res.status(400).send({
          msg: '未参加该群组'
        });
      }

      // 判断该用户是否为群主
      if (req.group.leader._id.toString() === req.user._id.toString()) {
        if (req.group.member.length > 1) {
          return res.status(200).send({
            msg: '没有成员，群组会删除'
          });
        } else {
          return res.status(200).send({
            msg: '指定新群主'
          });
        }
      } else {
        Groups.update({
          '_id': req.group._id,
          'active': true
        }, {
          $pull: {
            'member': {
              '_id': req.user._id
            }
          }
        }, function(err, numberAffected) {
          if (err) {
            log(err);
            return res.sendStatus(500);
          } else {
            return res.status(200).send({
              msg: '退出群组成功'
            });
          }
        });
      }
    },
    /**
     * 移除群组
     * 请求用户非群主, 则无权限移除该群组成员, 则返回403, msg: 无权限
     * 请求用户为群主, 移除成员非该群组成员, 则返回400, msg: 移除成员非改群组的成员
     * 请求用户为群主, 移除成员为该群组成员
     *     移除成员为群主, 返回400, msg: 群主无法移除该群
     *     移除成员为非群组, 返回200, msg: 移除成员成功
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    removeMemberFromGroup: function(req, res) {
      // 判断该请求用户是否是该群的群主
      if (req.user._id.toString() !== req.group.leader._id.toString()) {
        return res.status(403).send({
          msg: '无权限'
        });
      }

      // 判断移除用户是否已经是该群组成员
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.params.userId.toString()
      });

      if (!isMember) {
        return res.status(400).send({
          msg: '该成员未参加该群组'
        });
      }

      if (req.params.userId.toString() === req.user._id.toString()) {
        return res.status(400).send({
          msg: '群主无法移除该群'
        });
      } else {
        Groups.update({
          '_id': req.group._id,
          'active': true
        }, {
          $pull: {
            'member': {
              '_id': req.params.userId
            }
          }
        }, function(err, numberAffected) {
          if (err) {
            log(err);
            return res.sendStatus(500);
          } else {
            return res.status(200).send({
              msg: '移除成员成功'
            });
          }
        });
      }
    },
    /**
     * 指定新群主
     * 请求用户非群主, 则无权限移除该群组成员, 则返回403, msg: 无权限
     * 请求用户为群主
     *   被指定用户非该群组成员, 则返回400, msg: 被指定成员非该群组成员
     *   被指定用户为该群组成员, 指定其为群主, 则返回200, msg: 指定群主成功
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    reassignLeaderForGroup: function(req, res) {
      // 判断该请求用户是否是该群的群主
      if (req.user._id.toString() !== req.group.leader._id.toString()) {
        return res.status(403).send({
          msg: '无权限'
        });
      }
      var user;
      // 判断移除用户是否已经是该群组成员
      var isMember = req.group.member.some(function(member) {
        user = member;
        return member._id.toString() === req.params.userId.toString()
      });

      if (!isMember) {
        return res.status(400).send({
          msg: '被指定成员非该群组成员'
        });
      }

      Groups.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: {
          'member': {
            '_id': user._id,
            'nickname': user.nickname,
            'photo': user.photo
          }
        }
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            msg: '指定群主成功'
          });
        }
      });
    },
    /**
     * 删除群组
     * 请求用户非群主, 则返回403, msg: 无权限
     * 请求用户为群主,
     *     若该群组有其他成员(除群主), 则返回400, msg: 只有没有成员时该群组才能删除
     *     若该群组无其他成员(除群主), 则返回200, msg: 删除群组成功
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    deleteGroup: function(req, res) {
      // 判断该请求用户是否是该群的群主
      if (req.user._id.toString() !== req.group.leader._id.toString()) {
        return res.status(403).send({
          msg: '无权限'
        });
      }

      if (req.group.member.length > 1) {
        return res.status(400).send({
          msg: '只有没有成员时该群组才能删除'
        });
      }

      Groups.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: {
          'active': false
        }
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            msg: '删除群组成功'
          });
        }
      });

    },
    /**
     * 搜索群组
     * body {
     *   regex: String
     * }
     * TODO: 需要验证
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    searchGroup: function(req, res) {
      if (!req.body.regex) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }

      var regex = '/' + req.body.regex + '/';

      var conditions = {
        'cid': req.user.cid,
        'active': true,
        'open': true,
        $or: [{
          'name': {
            $regex: regex
          }
        }, {
          'brief': {
            $regex: regex
          }
        }]
      };

      var projection = {
        'name': 1,
        'logo': 1,
        'themeColor': 1,
        'brief': 1
      };

      Groups.find(conditions, projection, function(err, docs) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            group: docs
          });
        }
      });
    },
    /**
     * 获取个人群组列表
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getGroupListOfUser: function(req, res) {
      var conditions = {
        'member': {
          $elemMatch: {
            '_id': req.user._id
          }
        },
        'active': true
      };

      var projection = {
        'name': 1,
        'logo': 1,
        'themeColor': 1,
        'brief': 1
      };

      Groups.find(conditions, projection, function(err, docs) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            groups: docs
          });
        }
      });
    },
    /**
     * 获取公司群组列表
     * 如果需要统计人数，则使用aggregate
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getGroupListOfCompany: function(req, res) {
      var conditions = {
        'cid': req.user.cid,
        'active': true,
        'open': true
      };

      var projection = {
        'name': 1,
        'logo': 1,
        'themeColor': 1,
        'brief': 1
      };

      Groups.find(conditions, projection, function(err, docs) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            groups: docs
          });
        }
      });
    },
    /**
     * 获取群组详细信息
     * body {
     *   allInfo: Boolean,
     * }
     * 若allInfo的值为true, 请求用户必须是群组成员;
     * 
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    getGroupInfo: function(req, res) {
      var conditions = {
        '_id': req.params.groupId,
        'active': true
      };

      var projection = {
        'name': 1,
        'logo': 1,
        'brief': 1
      };

      if (req.body.allInfo) {
        conditions.member = {
          $elemMatch: {
            '_id': req.user._id
          }
        };
        projection = {};
      }

      Groups.findOne(conditions, projection, function(err, group) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            groups: group
          });
        }
      });
    },
    /**
     * 受邀用户处理邀请
     * 请求用户已经加入该群组, 则返回400, msg: 已加入该群组
     * 请求用户未在受邀列表, 则返回400, msg: 请求用户非该群组受邀用户
     * 请求用户在受邀列表
     *    如果拒绝邀请, 则返回200, msg: 拒绝加入受邀群组成功
     *    如果接受邀请, 则返回200, msg: 加入受邀群组成功
     * @param  {[type]} req [description]
     * body:
     * {
     *    accept: Boolean
     * }
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    handleInvitationFromGroup: function(req, res) {
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      });

      if (isMember) {
        return res.status(400).send({
          msg: '用户已加入该群组'
        });
      }

      var isInvitedMember = req.group.inviteMember.some(function(member) {
        return member.inviteMemberId.toString() === req.user._id.toString()
      });

      if (!isInvitedMember) {
        return res.status(400).send({
          msg: '请求用户不在受邀列表'
        });
      }

      var doc = {
        $pull: {
          'inviteMember': {
            'inviteMemberId': req.user._id
          }
        }
      };
      var msg = '拒绝加入受邀群组成功';

      if (req.body.accept) {
        doc.$addToSet = {
          'member': {
            _id: req.user._id, // 成员id
            nickname: req.user.nickname, // 成员昵称
            photo: req.user.photo, // 成员头像
          }
        };
        msg = '加入受邀群组成功';
      }
      //TODO: 或许加入拒绝记录
      Groups.update({
        '_id': req.group._id,
        'active': true
      }, doc, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            msg: msg
          });
        }
      });
    },
    /**
     * 群主处理申请记录
     * 请求用户非该群组的群主, 则返回403, msg: 无权限
     * 申请用户已经加入该群组, 则返回400, msg: 申请用户已加入该群组
     * 申请用户未在受邀列表, 则返回400, msg: 申请用户不在申请列表
     * 请求用户在受邀列表
     *    如果拒绝邀请, 则返回200, msg: 拒绝该申请
     *    如果接受邀请, 则返回200, msg: 同意该申请
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    handleApplication: function(req, res) {
      if (req.user._id.toString() === req.group.leader._id.toString()) {
        return res.status(200).send({
          msg: '无权限'
        });
      }

      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      });

      if (isMember) {
        return res.status(400).send({
          msg: '申请用户已加入该群组'
        });
      }
      var user;
      var isApplyMember = req.group.applyMember.some(function(member) {
        user = member;
        return member._id.toString() === req.user._id.toString()
      });

      if (!isApplyMember) {
        return res.status(400).send({
          msg: '申请用户不在申请列表'
        });
      }

      var doc = {
        $pull: {
          'applyMember': {
            '_id': req.user._id
          }
        }
      };
      var msg = '拒绝该申请';

      if (req.body.accept) {
        doc.$addToSet = {
          'member': {
            _id: user._id, // 成员id
            nickname: user.nickname, // 成员昵称
            photo: user.photo, // 成员头像
          }
        };
        msg = '同意该申请';
      }
      //TODO: 或许加入拒绝记录
      Groups.update({
        '_id': req.group._id,
        'active': true
      }, doc, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            msg: msg
          });
        }
      });
    }
  };
};
