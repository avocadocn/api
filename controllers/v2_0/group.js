'use strict';

var path = require('path'),
  fs = require('fs'),
  shortid = require('shortid'),
  multiparty = require('multiparty');

var mongoose = require('mongoose');
var Team = mongoose.model('Team');
var User = mongoose.model('User');
var GroupInviteCode = mongoose.model('GroupInviteCode');
var Company = mongoose.model('Company');

var auth = require('../../services/auth.js'),
  log = require('../../services/error_log.js'),
  uploader = require('../../services/uploader.js'),
  tools = require('../../tools/tools.js'),
  donlerValidator = require('../../services/donler_validator.js'),
  async = require('async'),
  notificationController = require('./notifications.js'),
  easemob = require('../../services/easemob.js');

// TODO: 群组API涉及到权限判断，同时有重复代码，需要
// 修改原权限判断代码，优化代码。
module.exports = {
    //验证权限 是否为群管理员
    validateAdmin: function(req, res, next) {
      if(req.user.isTeamAdmin(req.params.groupId)) {
        next();
      }
      else {
        return res.status(403).send({msg:'抱歉，您无管理员权限'});
      }
    },
    //验证权限，是否为群主
    validateLeader: function(req, res, next) {
      if(req.user.isTeamLeader(req.params.groupId)) {
        next();
      }
      else {
        return res.status(403).send({msg:'抱歉，您无管理员权限'});
      }
    },
    validateSuperAdmin: function(req, res, next) {
      //如果是存在req.group则判断是否为该群所在学校的管理员，否则为自己的学校的
      if(req.user.isSuperAdmin(req.group ? req.group.cid : req.user.cid)&&(!req.group ||req.group.level===1)) {
        next();
      }
      else {
        return res.status(403).send({msg:'抱歉，您无大使权限'});
      }
    },
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
            value: (fields['name'] && fields['name'][0]) ? fields['name'][0] : undefined,
            validators: ['required']
          },
          // themeColor: {
          //   name: '主题颜色',
          //   value: (fields['themeColor'] && fields['themeColor'][0]) ? fields['themeColor'][0] : undefined,
          //   validators: []
          // },
          // logo: {
          //   name: '封面',
          //   value: (files[fieldName] && files[fieldName][0].originalFilename) ? files[fieldName][0].originalFilename : undefined,
          //   validators: ['required']
          // }
        }, 'complete', function(pass, msg) {
          if (pass) {
            req.groupInfo = {};

            req.groupInfo.name = fields['name'][0];
            req.groupInfo.themeColor = fields['themeColor'] ? fields['themeColor'][0] : '';
            req.groupInfo.brief = fields['brief'] ? fields['brief'][0]:'';
            req.groupInfo.open = fields['open'][0];
            req.groupInfo.hasValidate = fields['hasValidate'][0];
            req.groupLogoFile = files[fieldName] ? files[fieldName] :'';
            req.isAdmin = fields['isAdmin'][0];

            next();
          } else {
            var resMsg = donlerValidator.combineMsg(msg);
            // console.log(resMsg);
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
        saveOrigin: true,
        getSize: true,
        success: function(imgInfo, oriCallback) {
          req.groupInfo.logo = path.join('/img/groups', imgInfo.url);
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
      var isAdmin = req.isAdmin==='true' && req.user.role === 'SuperAdmin';
      var userId = req.user._id; // 群组管理人员（队长）
      var team = new Team({
        cid: req.user.cid, // 公司id

        cname: req.user.cname, // 公司名称

        name: req.groupInfo.name, // 群组名称

        logo: req.groupInfo.logo, // 群组封面

        themeColor: req.groupInfo.themeColor, // 群组主题颜色

        brief: req.groupInfo.brief,

        open: req.groupInfo.open,

        hasValidate: req.groupInfo.hasValidate,
        // 群组管理人员（队长）
        leader: isAdmin ? null : userId,
        // 群组成员
        member: isAdmin ? [] : [{_id:userId}],

        level: isAdmin ? 1 : 0
      });

      var groupMembers = team.member.length ? [userId] : [];

      team.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '群组创建成功'
          });

          //创建群聊
          easemob.group.add({
            "groupname": team.id,
            "desc": team.name,
            "public": true,
            "owner": req.user.cid,
            "members": groupMembers
          }, function(error, data) {
            if (error) {
              log(error);
            } else {

              Team.update({
                '_id': team._id
              }, {
                $set: {
                  'easemobId': data.data.groupid
                }
              }, function(err) {
                if (err) {
                  log(err);
                }
              });
            }
          });

          if(!isAdmin) {
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

          Company.update({
            '_id': req.user.cid
          }, {
            $addToSet: {
              'team': {
                _id: team._id //群组id
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
     * 根据群组的id获取群组的信息, 若无相应群组数据，返回204；否则，下一步
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
            return res.sendStatus(400);
            // return res.status(204).send({
            //   msg: '未找到该群组'
            // });
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
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        req.groupInfo = req.body;
        next();
        return;
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
        req.groupLogoFile = (files[fieldName] && files[fieldName][0].originalFilename) ? files[fieldName] : undefined;
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
     * 判断受邀用户id已经加入或者被邀请以及该用户id不存在, 则不将该受邀用户id加入invitedUserIds, 并且不返回前端任何信息
     * 如果invitedUserIds的长度为0, 则返回400, msg: 用户已经加入该群组或者已被邀请
     * 如果invitedUserIds的长度不为0, 
     *    userDocs的长度为0, 则返回400, msg: 受邀用户不存在
     *    userDocs的长度不为0,
     *      则将邀请记录加入inviteMember, 返回200, msg: 邀请成功
     * 
     * @param  {[type]} req [description]
     * body
     * {
     *   userIds: [] //用户id
     * }
     * @param  {[type]} res [description]
     * @return {[type]}     [description]
     */
    inviteMemberToGroup: function(req, res) {
      // 判断权限
      // TODO: update auth code
      var isMember = req.group.member.some(function(member) {
        return member._id.toString() === req.user._id.toString()
      }); // TODO: check it

      if (!isMember) {
        return res.status(403).send({
          msg: '无权限'
        });
      }

      var invitedUserIds = req.body.userIds.filter(isMemberOrInvited);

      function isMemberOrInvited(id) {
        // 判断该用户是否已经是该群组成员
        var isMember = req.group.member.some(function(member) {
          return member._id.toString() === id.toString()
        });

        // 判断该该用户是否已被邀请
        var isInvited = req.group.inviteMember.some(function(inviteMember) {
          return inviteMember.inviteMemberId.toString() === id.toString()
        });

        return (!isMember && !isInvited);
      }

      if (!invitedUserIds.length) {
        return res.status(400).send({
          msg: '用户已经加入该群组或者已被邀请'
        });
      }

      // TODO: 是否加入cid判断，受邀用户cid与邀请用户cid是否一致, 也就是说受邀用户必须在邀请用户在同一家公司
      User.find({
        '_id': {
          $in: invitedUserIds
        }
      }, {'_id': 1}, function(err, userDocs) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }

        if (!userDocs.length) {
          return res.status(400).send({
            msg: '受邀用户不存在'
          });
        }

        var userIds = userDocs.map(function(user){ return user._id.toString(); });

        var invitedUsers = [];

        userIds.map(function(id) {
          invitedUsers.push({'inviteMemberId': id, '_id': req.user._id});
        });

        // 将邀请记录加入inviteMember
        Team.update({
          '_id': req.group._id,
          'active': true
        }, {
          $addToSet: {
            'inviteMember': {
              $each: invitedUsers
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

          res.status(200).send({
            msg: '邀请成功'
          });

          //发通知给被邀请的
          if(invitedUsers.length) {
            for(var i=invitedUsers.length-1; i>=0; i--) {
              notificationController.sendTeamNtct(6, req.group, req.user._id, invitedUsers[i].inviteMemberId);
            }
          }
        });
      });
      // // 判断该用户是否已经是该群组成员
      // var isMember = req.group.member.some(function(member) {
      //   return member._id.toString() === req.params.userId.toString()
      // });

      // if (isMember) {
      //   return res.status(400).send({
      //     msg: '用户已经加入该群组'
      //   });
      // }
      // // 判断该该用户是否已被邀请
      // var isInvited = req.group.inviteMember.some(function(inviteMember) {
      //   return inviteMember.inviteMemberId.toString() === req.params.userId.toString()
      // });

      // if (isInvited) {
      //   return res.status(400).send({
      //     msg: '用户已邀请'
      //   });
      // }
      // 
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
          _id: req.user._id
        }
      });

      groupInviteCode.save(function(err) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
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
              _id: req.user._id // 成员id
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
            //发通知给管理员
            notificationController.sendTeamNtct(8, req.group, req.user._id);
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

            //加入群聊
            easemob.group.addUser(req.group.easemobId, req.user._id);

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
      if (req.group.leader.toString() === req.user._id.toString()) {
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

            //从群聊中删除
            easemob.group.deleteUser(req.group.easemobId, req.user._id);

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

            //从群聊中删除
            easemob.group.deleteUser(req.group.easemobId, req.params.userId);

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

      var user;
      // 判断移除用户是否已经是该群组成员
      var isMember = req.group.member.some(function(member) {
        return (member._id.toString() === req.params.userId.toString() && (user = member))
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
          'leader': user._id
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

          //删除群聊
          easemob.group.delete(req.group.easemobId, function (err, data) {
            console.log(err);
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

          Company.update({
            '_id': req.user.cid
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
      //1认证过的小队，0未认证的小队，其他则为所有
      if(req.query.type ==='1'){
        conditions.level= 1;
      }
      else if(req.query.type ==='0') {
        conditions.level= 0;
      }
      var projection = {
        'name': 1,
        'logo': 1,
        'themeColor': 1,
        'brief': 1,
        'level':1,
        'hasValidate':1,
        'score':1
      };
      var isAdmin = req.user.isSuperAdmin(req.user.cid) && req.query.from === 'admin';
      if(isAdmin) {
        projection.applyStatus = 1;
        projection.leader = 1;
        projection.member = 1;
      };
      var doc = Team.find(conditions, projection);
      if(isAdmin) {
        doc = doc.populate({path:'leader', select:'photo nickname'});
      }

      doc.exec()
      .then(function(docs) {
        return res.status(200).send({groups: docs});
      })
      .then(null, function(err) {
        return res.sendStatus(500);
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
        if(req.user.role!=="SuperAdmin") {
          conditions.member = {
            $elemMatch: {
              '_id': req.user._id
            }
          };
        }
        projection = {};
      }

      Team.findOne(conditions, projection)
      .populate('leader')
      .exec()
      .then(function(group) {
        res.status(200).send({
          group: group
        });
      })
      .then(null,function(err) {
        log(err);
        return res.sendStatus(500);
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

      if (req.query.accept === 'true') {
        doc.$addToSet = {
          'member': {
            _id: req.user._id // 成员id
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
          if (req.query.accept === 'true') {

            //加入群聊
            easemob.group.addUser(req.group.easemobId, req.user._id);

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
        return (member._id.toString() === req.params.userId.toString() && (user = member))
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

      if (req.query.accept === 'true') {
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
          if (req.query.accept === 'true') {
            //加入群聊
            easemob.group.addUser(req.group.easemobId, req.user._id);

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
            notificationController.sendTeamNtct(7, team, req.user._id, req.params.userId);
            var result = req.query.accept === 'true';
            notificationController.updateTeamNfct(team, req.params.userId, req.user._id, result);
          }
        }
      });
    },
    addLeader: function(req, res) {
      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: {"leader":req.body.userId},
        $addToSet: {
          'member': {
            _id: req.user._id // 成员id
          }
        }
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '设置群主成功！'
          });
          // 更新user的team属性
          User.update({
            _id:req.body.userId
          }, {
            $addToSet: {
              'team': { // 群组组件
                _id: req.group._id, //群组id
                leader: true,
                public: req.group.public
              }
            }
          }, {
            multi: false
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
          });
        }
      });
    },
    addAdmin: function(req, res) {
      if(!req.group.isMember(req.body.userId)) {
        return res.status(400).send({msg:"该成员不是本小队成员，无法任命为管理员"})
      }
      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $addToSet: {"administrators":req.body.userId}
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '设置管理员成功'
          });
          // 更新user的team属性
          User.update({
            _id:req.body.userId,
            'team': {
              '$elemMatch': {
                '_id': req.group._id
              }
            }
          }, {
            $set: {
              'team.$.admin': true
            }
          }, {
            multi: false
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
          });
        }
      });
    },
    removeAdmin: function(req, res) {
      if(!req.group.isAdmin(req.body.userId)) {
        return res.status(400).send({msg:"该成员不是本小队管理员，无法移除"})
      }
      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $pull: {"administrators":req.body.userId}
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '移除管理员成功'
          });
          // 更新user的team属性
          User.update({
            _id:req.body.userId,
            'team': {
              '$elemMatch': {
                '_id': req.group._id
              }
            }
          }, {
            $set: {
              'team.$.admin': false
            }
          }, {
            multi: false
          }, function(err, numberAffected) {
            if (err) {
              log(err);
            }
          });
        }
      });
    },
    requestUpdate: function(req, res) {
      if(req.group.applyStatus === 1) {
        return res.status(400).send({msg:"已经收到了您申请的认证，无需重复申请！"})
      }
      else if(req.group.level === 1 || req.group.applyStatus === 2) {
        return res.status(400).send({msg:"您的群已经通过认证，无需继续申请！"})
      }
      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: {"applyStatus":1}
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '申请成功！'
          });
        }
      });
    },
    dealUpdate: function(req, res) {
      if(req.group.level === 1 || req.group.applyStatus !== 1) {
        return res.status(400).send({msg:"该群没有进行申请认证或已经通过了验证，无需处理！"})
      }
      var set;
      if(req.body.status) {
        set = {
          "applyStatus": 2,
          "level": 1
        }
      }
      else {
        set =  {
          "applyStatus": 3
        }
      }
      Team.update({
        '_id': req.group._id,
        'active': true
      }, {
        $set: set
      }, function(err, numberAffected) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        } else {
          res.status(200).send({
            msg: '处理成功！'
          });
        }
      });
    },
    getUpdateList: function(req, res) {
      var conditions = {
        'cid':req.user.cid,
        'active': true,
        'level':0,
        'applyStatus':1
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
    }
};
