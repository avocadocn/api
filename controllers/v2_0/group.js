'use strict';

var path = require('path'),
  fs = require('fs'),
  shortid = require('shortid'),
  multiparty = require('multiparty');

var mongoose = require('mongoose');
var Team = mongoose.model('Team');
var User = mongoose.model('User');
var GroupInviteCode = mongoose.model('GroupInviteCode');

var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  uploader = require('../../services/uploader.js'),
  tools = require('../../tools/tools.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  async = require('async'),
  notificationController = require('./notifications.js');

// TODO: 群组API涉及到权限判断，同时有重复代码，需要
// 修改原权限判断代码，优化代码。
module.exports = {
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
            value: files[fieldName],
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
            console.log(resMsg);
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

      uploader.uploadImage(req.groupLogoFile[0], {
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

      var team = new Team({
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

      team.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '群组创建成功'
          });
          // 更新user的team属性
          // TODO: 增加conditions条件
          User.update({
            '_id': req.user._id
          }, {
            $addToSet: {
              'team': {
                _id: team._id, //群组id
                leader: true, //该员工是不是这个群组的队长
                public: false
              }
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
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
    getGroupById: function(req, res, next) {
      Team.findOne({
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
        req.groupInfo.name = (fields['name'] && fields['name'][0]) ? fields['name'][0] : undefined;
        req.groupInfo.themeColor = (fields['themeColor'] && fields['themeColor'][0]) ? fields['themeColor'][0] : undefined;
        req.groupLogoFile = (files[fieldName] && files[fieldName][0].originalFilename) ? files[fieldName][0] : undefined;
        // 额外群组设置
        req.groupInfo.brief = (fields['brief'] && fields['brief'][0]) ? fields['brief'][0] : undefined;
        req.groupInfo.open = (fields['open'] && fields['open'][0]) ? fields['open'][0] : undefined;
        req.groupInfo.hasValidate = (fields['hasValidate'] && fields['hasValidate'][0]) ? fields['hasValidate'][0] : undefined;

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
      for (var o in req.groupInfo) {
        if (req.groupInfo[o] !== undefined) {
          doc[o] = req.groupInfo[o];
        }
      }

      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: doc
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '编辑群组成功'
          });
          // 更新user的team属性
          if (req.groupInfo.open !== undefined) {
            // TODO: 增加conditions条件
            User.update({
              'team': {
                '$elemMatch': {
                  '_id': req.group._id
                }
              }
            }, {
              $set: {
                'team.$.public': req.groupInfo.open
              }
            }, {
              multi: true
            }, function(err, numberAffected) {
              if (err) {
                log(err);
              }
            });
          }
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
        return member._id.toString() === req.params.userId.toString()
      });

      if (isMember) {
        return res.status(400).send({
          msg: '用户已经加入该群组'
        });
      }
      // 判断该该用户是否已被邀请
      var isInvited = req.group.inviteMember.some(function(inviteMember) {
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
          Team.update({
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

      // 邀请链接网址生成
      shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_#');

      var inviteCode = shortid.generate();

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
     *         hasValidate: Boolean
     *         ....
     *       }
     * 如果group.hasValidate的值为true, 那么用户加入群组需要验证信息;否则，直接加入群组。
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

      if(req.group.hasValidate) {
        var hasApply = req.group.applyMember.some(function(member) {
          return member._id.toString() === req.user._id.toString()
        });

        if (hasApply) {
          return res.status(400).send({
            msg: '用户已经申请该群组'
          });
        }

        Team.update({
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
            res.status(200).send({
              msg: '申请加入该群组成功'
            });
            //发通知给群主
            notificationController.sendTeamNtct(8, req.group, req.user._id, req.group.leader._id);
          }
        });
      } else {
        Team.update({
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
            res.status(200).send({
              msg: '加入群组成功'
            });

            // 更新user的team属性
            // TODO: 增加conditions条件
            User.update({
              '_id': req.user._id
            }, {
              $addToSet: {
                'team': {
                  _id: req.group._id, //群组id
                  leader: false, //该员工是不是这个群组的队长
                  public: req.group.open
                }
              }
            }, function(err, numberAffected) {
              if (err) {
                log(err);
              }
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
            msg: '指定新群主'
          });
        } else {
          return res.status(200).send({
            msg: '没有成员，群组会删除'
          });
        }
      } else {
        Team.update({
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
            res.status(200).send({
              msg: '退出群组成功'
            });

            // 更新user的team属性
            // TODO: 增加conditions条件
            User.update({
              '_id': req.user._id
            }, {
              $pull: {
                'team': {
                  _id: req.group._id//群组id
                }
              }
            }, function(err, numberAffected) {
              if (err) {
                log(err);
              }
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
        Team.update({
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
            res.status(200).send({
              msg: '移除成员成功'
            });

            // 更新user的team属性
            // TODO: 增加conditions条件
            User.update({
              '_id': req.params.userId
            }, {
              $pull: {
                'team': {
                  _id: req.group._id//群组id
                }
              }
            }, function(err, numberAffected) {
              if (err) {
                log(err);
              }
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

      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: {
          'leader': {
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
          res.status(200).send({
            msg: '指定群主成功'
          });

          // 更新user的team属性
          // TODO: 增加conditions条件
          User.update({
            '_id': req.params.userId,
            'team': {
              '$elemMatch': {
                '_id': req.group._id
              }
            }
          }, {
            $set: {
              'team.$.leader': true
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
          });

          User.update({
            '_id': req.user._id,
            'team': {
              '$elemMatch': {
                '_id': req.group._id
              }
            }
          }, {
            $set: {
              'team.$.leader': false
            }
          }, {
            multi: true
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
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

      Team.update({
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
          res.status(200).send({
            msg: '删除群组成功'
          });

          // 更新user的team属性
          // TODO: 增加conditions条件
          User.update({
            '_id': req.user._id
          }, {
            $pull: {
              'team': {
                _id: req.group._id //群组id
              }
            }
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
          });
        }
      });

    },
    /**
     * 搜索群组
     * query {
     *   regex: String
     * }
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    searchGroup: function(req, res) {
      if (!req.query.regex) {
        return res.status(400).send({
          msg: '参数错误'
        });
      }
      // 从swagger传送过来的中文必须使用unescape解析才能成功,
      // 其他方式或许不同。同时, js将来或许不再支持unescape。
      req.query.regex = unescape(req.query.regex);

      var conditions = {
        'cid': req.user.cid,
        'active': true,
        'open': true,
        $or: [{
          'name': {
            $regex: req.query.regex
          }
        }, {
          'brief': {
            $regex: req.query.regex
          }
        }]
      };

      var projection = {
        'name': 1,
        'logo': 1,
        'themeColor': 1,
        'brief': 1
      };

      Team.find(conditions, projection, function(err, docs) {
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

      Team.find(conditions, projection, function(err, docs) {
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

      Team.find(conditions, projection, function(err, docs) {
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
     * query {
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

      if (req.query.allInfo) {
        conditions.member = {
          $elemMatch: {
            '_id': req.user._id
          }
        };
        projection = {};
      }

      Team.findOne(conditions, projection, function(err, group) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          return res.status(200).send({
            group: group
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
     * query:
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

      if (req.query.accept) {
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
      Team.update({
        '_id': req.group._id,
        'active': true
      }, doc, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: msg
          });

          // 更新user的team属性
          // TODO: 增加conditions条件
          if (req.query.accept) {
            User.update({
              '_id': req.user._id
            }, {
              $addToSet: {
                'team': {
                  _id: req.group._id, //群组id
                  leader: false, //该员工是不是这个群组的队长
                  public: req.group.open
                }
              }
            }, function(err, numberAffected) {
              if (err) {
                log(err);
              }
            });
          }
        }
      });
    },
    /**
     * 群主处理申请记录
     * 请求用户非该群组的群主, 则返回403, msg: 无权限
     * 申请用户已经加入该群组, 则返回400, msg: 申请用户已加入该群组
     * 申请用户未在申请列表, 则返回400, msg: 申请用户不在申请列表
     * 请求用户在申请列表
     *    如果拒绝申请, 则返回200, msg: 拒绝该申请
     *    如果接受申请, 则返回200, msg: 同意该申请
     * @param  {[type]} req [description]
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    handleApplication: function(req, res) {
      if (req.user._id.toString() !== req.group.leader._id.toString()) {
        return res.status(403).send({
          msg: '无权限'
        });
      }
      console.log(req.query.accept);

      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.params.userId.toString()
      });

      if (isMember) {
        return res.status(400).send({
          msg: '申请用户已加入该群组'
        });
      }

      var user;
      var isApplyMember = req.group.applyMember.some(function(member) {
        user = member;
        return member._id.toString() === req.params.userId.toString()
      });

      if (!isApplyMember) {
        return res.status(400).send({
          msg: '申请用户不在申请列表'
        });
      }

      var doc = {
        $pull: {
          'applyMember': {
            '_id': req.params.userId
          }
        }
      };
      var msg = '拒绝该申请';

      if (req.query.accept) {
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
      Team.findOneAndUpdate({
        '_id': req.group._id,
        'active': true
      }, doc, function(err, team) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: msg
          });
          // 更新user的team属性
          // TODO: 增加conditions条件
          if (req.query.accept) {
            User.update({
              '_id': req.params.userId
            }, {
              $addToSet: {
                'team': {
                  _id: req.group._id, //群组id
                  leader: false, //该员工是不是这个群组的队长
                  public: req.group.open
                }
              }
            }, function(err, numberAffected) {
              if (err) {
                log(err);
              }
            });

            //发通知
            var _team = {_id: req.group._id, }
            notificationController.sendTeamNtct(7, team, req.user._id, req.params.userId);
          }
        }
      });
    }
};
