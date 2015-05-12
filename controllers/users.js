'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');
var Photo = mongoose.model('Photo');
var Comment = mongoose.model('Comment');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var donlerValidator = require('../services/donler_validator.js');
var validator = require('validator');
var emailService = require('../services/email.js');
var uploader = require('../services/uploader.js');
var auth = require('../services/auth.js');
var tools = require('../tools/tools.js');
var syncData = require('../services/sync_data.js');
var departmentController = require('../controllers/departments');
var async = require('async');
var publicDomain = require('../services/public_domain.js');

module.exports = function (app) {

  return {

    getCompanyByCid: function (req, res, next) {
      if (!req.body || !req.body.cid || req.body.cid === '') {
        res.status(400).send({ msg: 'cid不能为空' });
        return;
      }

      Company.findById(req.body.cid).exec()
        .then(function (company) {
          if (!company) {
            res.status(400).send({ msg: '没有找到对应的公司' });
          } else {
            req.company = company;
            next();
          }
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    userInfoValidate: function (req, res) {
      var email = req.body.email ? req.body.email.toLowerCase() :req.body.email;
      var cid = req.body.cid;
      var inviteKey = req.body.inviteKey;
      // if(!cid) {
      //   return res.status(400).send({msg:'数据输入有误'});
      // }
      if(email){
        User.findOne({username:email},{mail_active:1}).exec().then(function(user){
          if(user){
            if(user.mail_active) {
              //这个邮箱已激活、并注册完毕
              return res.status(200).send({'active':3});
            }
            else {
              //这个邮箱注册了未激活
              return res.status(200).send({'active':2});
            }
          }
          else{
            // Company.findOne({'_id':cid},function(err,company){
            //   if(company.email.domain.indexOf(email.split("@")[1])===-1){
            //     //这个邮箱后缀不对
            //     return res.status(200).send({'active':4});
            //   }
            //   else{
            var domain = email.split('@')[1];
            var hideInviteKey = !publicDomain.isPublicDomain(domain);
            //这个邮箱没用过,可以注册
            return res.status(200).send({'active':1, 'hideInviteKey':hideInviteKey});
            //   }
            // });
          }
        })
        .then(null,function(err){
          log(err);
          return res.status(500).send({'msg':'数据库错误'});
        });
      }else if(inviteKey && cid) {
        Company.findOne({_id:cid}).exec().then(function(company){
          if(company){
            if(inviteKey===company.invite_key){
              return res.status(200).send({'invitekeyCheck':1});
            }else{
              return res.status(200).send({'invitekeyCheck':2});
            }
          }else{
            return res.status(400).send({'msg':'未查找到公司'});
          }
        })
        .then(null,function(err){
          log(err);
          return res.status(500).send({'msg':'数据库错误'});
        });
      }else{
        return res.status(400).send({msg:'数据输入有误'});
      }
    },
    registerValidate: function (req, res, next) {
      var isUsedEmail = function (name, value, callback) {
        User.findOne({ email: value }).exec()
          .then(function (user) {
            if (user) {
              callback(false, '该邮箱已被注册');
              return;
            }
            callback(true);
          })
          .then(null, function (err) {
            log(err);
            callback(false, '服务器错误');
          });
      };

      var validateDomain = function (name, value, callback) {
        if (req.company.email.domain.indexOf(value) === -1) {
          callback(false, '邮箱后缀与公司允许的后缀不一致');
        } else {
          callback(true);
        }
      };

      
      // var validateDepartment = function (name, value, callback) {
      //   if (!value) {
      //     callback(true);
      //     return;
      //   }
      //   var departments = req.company.department;
      //   for (var i = 0; i < value.length; i++) {
      //     var index = tools.arrayObjectIndexOf(departments, value[i], 'name');
      //     if (index === -1) {
      //       callback(false, '公司没有开设该部门');
      //       return;
      //     } else {
      //       departments = departments[index].department;
      //     }
      //   }
      //   callback(true);
      // };
      var validateInviteKey = function (name, value, callback) {
        var domain = value.email.split('@')[1];
        if(!publicDomain.isPublicDomain(domain) || value.company.invite_key === value.inviteKey) {
          callback(true);
        }
        else {
          callback(false,'激活码错误');
        }
      }
      var email = req.body.email.toLowerCase();
      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required']
        },
        email: {
          name: '企业邮箱',
          value: email,
          validators: ['required', 'email', isUsedEmail]
        },
        domain: {
          name: '邮箱后缀',
          value: email.split('@')[1],
          validators: [validateDomain]
        },
        nickname: {
          name: '昵称',
          value: req.body.nickname,
          validators: ['required', donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        realname: {
          name: '真实姓名',
          value: req.body.realname,
          validators: ['required']
        },
        // department: {
        //   name: '部门',
        //   value: req.body.department,
        //   validators: [validateDepartment]
        // },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number']
        }, 
        invite_key: {
          name: '邀请码',
          value: {inviteKey:req.body.inviteKey, email: email, company:req.company},
          validators: [validateInviteKey]
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    register: function (req, res) {
      var email = req.body.email.toLowerCase();
      var user = new User({
        email: email,
        username: email,
        cid: req.company._id,
        cname: req.company.info.name,
        nickname: req.body.nickname,
        password: req.body.password,
        realname: req.body.realname,
        phone: req.body.phone,
        role: 'EMPLOYEE'
      });

      // if (!publicDomain.isPublicDomain(value) || req.company.invite_key === req.body.inviteKey) {
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        emailService.sendStaffActiveMail(user.email, user._id.toString(), user.cid.toString(), function (err) {
          if (err) {
            log(err);
            res.sendStatus(500);
          } else {
            res.sendStatus(201);
          }
        });
      });
      // }
      else {
        res.status(400).send({msg:'验证码错误'});
      }
    },

    forgetPassword: function (req, res) {
      User.findOne({email: req.body.email.toLowerCase()}, function(err, user) {
        if(err || !user) {
          return res.status(400).send({msg:'邮箱填写错误'});
        } else {
          emailService.sendStaffResetPwdMail(user.email, user._id.toString(), function(err) {
            if(err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.sendStatus(201);
            }
          });
        }
      });
    },

    sendFeedback: function (req, res) {
      emailService.sendFeedBackMail(req.user.username, req.body.content, function(err) {
        if(err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(201);
        }
      });
    },

    getUserById: function (req, res, next) {
      //获取免打扰开关
      if(req.query.responseKey==='pushToggle') {
        var user = {'pushToggle' : req.user.push_toggle};
        return res.status(200).send(user);
      }
      //获取某活动的未读评论数
      // if(req.query.commentCampaignId) {
      //   var indexOfCC = tools.arrayObjectIndexOf(req.user.commentCampaigns, req.query.commentCampaignId, '_id');
      //   if(indexOfCC > -1) {
      //     var unreadNumbers = req.user.commentCampaigns[indexOfCC].unread;
      //     return res.status(200).send({unreadNumbers: unreadNumbers});
      //   }else {
      //     var indexOfUCC = tools.arrayObjectIndexOf(req.user.unjoinedCommentCampaigns, req.query.commentCampaignId, '_id');
      //     if(indexOfUCC > -1) {
      //       var unreadNumbers = req.user.unjoinedCommentCampaigns[indexOfUCC].unread;
      //       return res.status(200).send({unreadNumbers: unreadNumbers});
      //     } else {
      //       return res.status(200).send({unreadNumbers: 0});
      //     }
      //   }
      // }
      
      //非获取免打扰
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }
          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['getUserCompleteData', 'getUserBriefData', 'getUserMinData']);
          if (allow.getUserCompleteData) {
            var tids = [],teams=[];
            user.team.forEach(function (team) {//不拿部门和公司
              if(team.entity_type!='virtual'){
                tids.push(team._id);
                teams.push(team);
              }
            });

            var completeData = {
              _id: user._id,
              active:user.active,
              mail_active:user.mail_active,
              email: user.email,
              nickname: user.nickname,
              photo: user.photo,
              realname: user.realname,
              department: user.department,
              sex: user.sex,
              birthday: user.birthday,
              bloodType: user.bloodType,
              introduce: user.introduce,
              registerDate: user.register_date,
              phone: user.phone,
              qq: user.qq,
              company: {
                _id: user.cid,
                name: user.company_official_name,
                briefName: user.cname
              },
              tids: tids,
              lastCommentTime: user.last_comment_time,
              score: user.score.total || 0,
              tags: user.tags,
              campaignCount:user.campaignCount || 0,
              team: teams
            };
            res.status(200).send(completeData);
          } else if (allow.getUserBriefData) {
            var tids = [];
            user.team.forEach(function (team) {//不拿部门和公司
              if(team.entity_type!='virtual') tids.push(team._id);
            });
            var briefData = {
              _id: user._id,
              email: user.email,
              nickname: user.nickname,
              photo: user.photo,
              realname: user.realname,
              department: user.department,
              sex: user.sex,
              birthday: user.birthday,
              bloodType: user.bloodType,
              introduce: user.introduce,
              company: {
                _id: user.cid,
                name: user.company_official_name,
                briefName: user.cname
              },
              phone: user.phone,
              qq: user.qq,
              score: user.score.total || 0,
              tags: user.tags,
              campaignCount: user.campaignCount || 0,
              tids: tids
            };
            res.status(200).send(briefData);
          } else if (allow.getUserMinData) {
            var minData = {
              _id: user._id,
              nickname: user.nickname,
              photo: user.photo
            };
            res.status(200).send(minData);
          } else {
            res.sendStatus(403);
          }

        })
        .then(null, next);
    },

    getCompanyUsers: function (req, res) {
      //resultType :1仅nickname，photo
      //2: username,photo,realname,department,team,campaignCount,score
      //3:待激活用户
      var findOptions = {'cid':req.params.companyId, 'active':true, 'mail_active':true};
      var outputOptions = {};
      if(req.user.provider==='company') { 
        if(req.user._id.toString() !== req.params.companyId) return res.sendStatus(403);
        else {
          //hr取来任命队长用
          if(!req.query.resultType || req.query.resultType=='1'){
            outputOptions = {'email':1,'nickname':1,'photo':1,'realname': 1};
          }
          //hr统计用户
          else if (req.query.resultType=='2'){
            findOptions = {'cid':req.params.companyId};
            outputOptions = {'nickname':1,'photo':1,'username':1,'sex': 1,'phone':1,'qq':1,'introduce': 1,'realname':1,'department':1,'team':1,'campaignCount':1,'score':1,'active':1,'mail_active':1};
          }
          //待激活用户
          else if (req.query.resultType=='3') {
            findOptions = {'cid':req.params.companyId, 'active':false,'invited':{"$ne":true}};
            outputOptions = {'username':1,'register_date':1,'mail_active':1, 'nickname':1};
          }else if (req.query.resultType=='4') {
            findOptions = {'cid':req.params.companyId, 'active':false, 'mail_active':false};
            outputOptions = {'_id':1};
          }
        }
      }
      else if(req.user.cid.toString() !== req.params.companyId){
        return res.sendStatus(403);
      }else{
        // 用户取来通讯录用及获取公司成员用
        // 获取常用的几个属性，尽管前端可能只需要其中的一部分
        outputOptions = {'email':1, 'nickname':1, 'photo': 1, 'realname': 1};
      }
      if(req.query.page) {
        var pageNum = 10;
        var page = req.query.page;
        User.paginate(findOptions, page, pageNum, function(err, pageCount, results, itemCount) {
          if(err){
            log(err);
            res.status(500).send({msg:err});
          }
          else{
            if (req.query.resultType=='2'){
              results.forEach(function (user) {
                var index = tools.arrayObjectIndexOf(user.team,'0','gid')
                if(index>-1){
                  user.team.splice(index,1);
                }
              })
            }
            return res.send({'users':results,'maxPage':pageCount,'hasNext':pageCount>page});
          }
        },{columns:outputOptions, sortBy:{'nickname':1}});
      }
      else{
        User.find(findOptions,outputOptions)
        .sort('nickname')
        .exec()
        .then(function (users){
          if (req.query.resultType == '2') {
            users.forEach(function(user) {
              var index = tools.arrayObjectIndexOf(user.team, '0', 'gid')
              if (index > -1) {
                user.team.splice(index, 1);
              }
            })
          }
          return res.status(200).send(users);
        })
        .then(null, function (err){
          log(err);
          return res.status(500).send({msg:'查询错误'});
        })
      }

    },

    updateValidate: function (req, res, next) {
      var role = auth.getRole(req.user, {
        companies: [req.resourceUser.cid],
        users: [req.resourceUser._id]
      });
      var allow = auth.auth(role, ['editUser']);
      if (!allow.editUser) {
        res.sendStatus(403);
        return;
      }
      donlerValidator({
        nickname: {
          name: '昵称',
          value: req.body.nickname,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: [donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        realname: {
          name: '真实姓名',
          value: req.body.realname,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        introduce: {
          name: '简介',
          value: req.body.introduce,
          validators: [donlerValidator.maxLength(40)]
        },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number', donlerValidator.isLength(11)]
        },
        qq: {
          name: 'qq',
          value: req.body.qq,
          validators: ['number']
        },
        birthday: {
          name: '生日',
          value: req.body.birthday,
          validators: ['date']
        },
        tag: {
          name: '标签',
          value: req.body.tag,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        sex: {
          name: '性别',
          value: req.body.sex,
          validators: ['sex']
        }
      }, 'complete', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    updatePhoto: function (req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/user/photo',
        success: function (url, oriName) {
          req.resourceUser.photo = path.join('/img/user/photo', url);
          req.updatePhoto = true;
          next();
        },
        error: function (err) {
          if (err.type === 'notfound') {
            next();
          } else {
            log(err);
            res.status(500).send({ msg: '服务器错误' });
          }
        }
      });
    },

    update: function (req, res) {
      var user = req.resourceUser;
      if (req.body.nickname) {
        user.nickname = req.body.nickname;
      }
      if (req.body.password) {
        if(user.authenticate(req.body.originPassword)) user.password = req.body.password;
        else
          return res.status(400).send({msg:'原密码填写错误'});
      }
      if (req.body.realname) {
        user.realname = req.body.realname;
      }
      if (req.body.phone) {
        user.phone = req.body.phone;
      }
      if (req.body.qq) {
        user.qq = req.body.qq;
      }
      if (req.body.birthday) {
        user.birthday = new Date(req.body.birthday);
      }
      if (req.body.pushToggle!==null) {
        user.push_toggle = req.body.pushToggle;
      }
      if (req.body.introduce!==null) {
        user.introduce = req.body.introduce;
      }
      if(req.body.tag) {
        var tag = req.body.tag;
        if(user.tags.indexOf(tag)===-1) user.tags.push(tag);
      }
      if(req.body.deleteTag) {
        var tag = req.body.deleteTag;
        var index = user.tags.indexOf(tag);
        if(index>-1) user.tags.splice(index, 1);
      }
      if(req.body.sex) {
        user.sex = req.body.sex;
      }
      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        if(req.body.did && (!user.department || !user.department._id || user.department._id.toString()!= req.body.did)) {
          departmentController(app).joinDepartment(user,req.body.did,function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
              return;
            }
            else {
              res.sendStatus(200);
            }
          });
        }
        else {
          res.sendStatus(200);
        }

        if (req.updatePhoto) {
          syncData.updateUlogo(user._id);
        }
        if (req.body.nickname) {
          syncData.updateUname(user._id);
        }
      });
    },

    login: function (req, res) {
      if (!req.body || !req.body.email || !req.body.password) {
        return res.status(400).send({ msg: '缺少邮箱或密码' });
      }

      User.findOne({
        email: req.body.email.toLowerCase()
      }).populate('cid').exec()
        .then(function (user) {
          if (!user) {
            return res.status(401).send({ msg: '邮箱地址不存在,请检查或注册。' });
          }

          if (!user.authenticate(req.body.password)) {
            return res.status(401).send({ msg: '密码输入错误,请检查重试。' });
          }

          if(!user.mail_active) {
            return res.status(401).send({ msg: '账号未激活,请至邮箱点击链接激活。' });
          }

          if(!user.active) {
            return res.status(401).send({ msg: '您的账号已被公司管理员禁用。' });
          }

          if(user.disabled) {
            return res.status(401).send({ msg: '账号已被关闭。'})
          }
          if(!user.cid.status.active) {
            return res.status(401).send({ msg: '你的账号所属公司已被关闭。'})
          }
          var payload = {
            type: "user",
            id: user._id.toString(),
            exp: app.get('tokenExpires') + Date.now()
          };
          var token = jwt.sign(payload, app.get('tokenSecret'));
          var pushInfo = req.body.pushInfo ||{};
          user.addDevice(req.headers, token, pushInfo);
          user.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.status(200).send({
                token: token,
                id:user._id,
                cid:user.cid.id,
                role:user.role
              });

              tokenService.redisToken.create(token, payload)
                .then(null, console.log);
            }
          });

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    refreshToken: function (req, res, next) {
      var token = req.headers['x-access-token'];
      tokenService.redisToken.refresh(token)
        .then(function(reply) {
          res.send({
            msg: '更新成功',
            newToken: token
          });
        })
        .then(null, function(err) {
          var newToken = jwt.sign({
            type: "user",
            id: req.user._id.toString(),
            exp: app.get('tokenExpires') + Date.now()
          }, app.get('tokenSecret'));
          req.user.updateDeviceToken(req.headers['x-access-token'], newToken);
          req.user.save(function(err) {
            if (err) next(err);
            else {
              res.send({
                msg: '更新成功',
                newToken: newToken
              });
            }
          });
        });
    },

    logout: function (req, res) {
      if (req.user.provider !== 'user') {
        res.sendStatus(403);
        return;
      }
      var token = req.headers['x-access-token'];
      req.user.removeDevice(req.headers);
      req.user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(204);
          tokenService.redisToken.delete(token)
            .then(null, console.log);
        }
      });
    },

    //屏蔽
    close: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.resourceUser.cid],
        users: [req.resourceUser._id]
      });
      var allow = auth.auth(role, ['closeUser']);
      if (!allow.closeUser) {
        res.sendStatus(403);
        return;
      }

      req.resourceUser.active = false;
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });

    },

    //取消屏蔽
    open: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.resourceUser.cid],
        users: [req.resourceUser._id]
      });
      var allow = auth.auth(role, ['openUser']);
      if (!allow.openUser) {
        res.sendStatus(403);
        return;
      }

      req.resourceUser.active = true;
      req.resourceUser.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });
    },

    //激活
    activeUser: function (req, res, next) {
      var srcUser = req.resourceUser;
      var role = auth.getRole(req.user, {
        companies: [srcUser.cid]
      });
      var allow = auth.auth(role, ['activeUser']);
      if (!allow.activeUser) {
        res.status(403).send({ msg: '您没有权限' });
        return;
      }

      srcUser.mail_active = true;
      srcUser.active = true;
      srcUser.save(function (err) {
        if (err) {
          next(err);
          return;
        }
        res.send({ msg: '激活成功' });
      });
    },

    inviteUser: function (req, res, next) {
      var email =req.body.email ? req.body.email.toLowerCase():req.body.email;
      if (!validator.isEmail(email)) {
        res.status(400).send({ msg: '请填写正确的邮箱地址' });
        return;
      }

      if (req.user.provider !== 'company') {
        res.status(403).send({ msg: '您没有权限' });
        return;
      }

      // 判断邮箱后缀是否为企业允许的邮箱后缀
      var emailDomain = email.split('@')[1];
      if (req.user.email.domain.indexOf(emailDomain) === -1) {
        res.status(400).send({ msg: '该邮箱不是企业允许的邮箱。如果您需要向该邮箱发送邀请链接，请先在企业账号设置中添加邮箱。' });
        return;
      }

      // 查询该邮箱是否已被注册过了
      User.findOne({
        email: email
      }, {
        _id: 1,
        email: 1,
        mail_active: 1,
        invited: 1
      }).exec()
        .then(function (user) {
          if (!user) {
            // 没有注册则新创建用户
            createNewUser();
          } else {
            if (user.mail_active === true) {
              // 如果已经激活，则返回提示
              res.send({ msg: '该用户已激活，无须再发送邀请信了。' });
            } else {
              // 还没有激活，则重新发送邀请信
              sendEmail(user);
            }
          }

        })
        .then(null, function (err) {
          next(err);
        });

      function createNewUser() {
        var user = new User({
          email: email,
          username: email,
          active: true,
          mail_active: false,
          invited: true,
          cid: req.user._id,
          cname: req.user.info.name,
          company_official_name: req.user.info.official_name
        });
        user.save(function (err) {
          if (err) {
            next(err);
          } else {
            sendEmail(user);
          }
        });
      }

      function sendEmail(user) {
        emailService.sendInvitedStaffActiveMail(user.email, {
          inviteKey: req.user.invite_key,
          uid: user.id,
          cid: req.user.id,
          cname: req.user.info.name
        }, function (err) {
          if (err) {
            next(err);
          } else {
            res.status(201).send({ msg: '成功发送邀请信' });
          }
        });
      }


    },
    batchinviteUser: function (req, res) {
      //status
      //0: 未注册
      //1: 邀请成功
      //2: 已经注册，且激活
      //3: 已经注册，未激活
      //4: 不是企业邮箱
      //5: 不是合法邮箱
      //6: 邮件发送错误
      //7: 数据库发送错误
      if(req.user.provider!== 'company'){
        return res.status(403).send({ msg: '您没有权限进行批量邀请用户' });
      }
      var operateFlag = req.body.operate;
      var members = req.body.members;
      var createNewUser =function (member,callback) {
        var user = new User({
          email: member.email,
          username: member.email,
          realname:member.name,
          nickname:member.name,
          password:req.user.default_user_password,
          active: true,
          mail_active: false,
          invited: true,
          cid: req.user._id,
          cname: req.user.info.name,
          company_official_name: req.user.info.official_name
        });
        user.save(function (err) {
          if (err) {
            member.status = 7;
            return callback(null,member)
          } else {
            member.id= user.id;
            sendEmail(member,callback);
          }
        });
      }

      function sendEmail(member,callback) {
        emailService.sendInvitedStaffActiveMail(member.email, {
          inviteKey: req.user.invite_key,
          uid: member.id,
          cid: req.user.id,
          cname: req.user.info.name
        }, function (err) {
          if (err) {
            member.status=6;
            log(err)
          }
          else{
            member.status=1;
          }
          callback(null,member)
        });
      }
      async.map(members, function (member,callback) {
        if (!validator.isEmail(member.email)) {
          member.status = 5;
          return callback(null,member)
        }
        // 判断邮箱后缀是否为企业允许的邮箱后缀
        var emailDomain = member.email.split('@')[1];
        if (req.user.email.domain.indexOf(emailDomain) === -1) {
          member.status = 4;
          return callback(null,member)
        }

        // 查询该邮箱是否已被注册过了
        User.findOne({
          email: member.email
        }, {
          _id: 1,
          email: 1,
          mail_active: 1,
          invited: 1
        }).exec()
          .then(function (user) {
            if (!user) {
              member.status = 0
              // 没有注册则新创建用户
              if(operateFlag){
                createNewUser(member,callback);
              }
              else{
                callback(null,member)
              }
              
            } else {
              if (user.mail_active === true) {
                // 如果已经激活，则返回提示
                member.status = 2;
                callback(null,member)
              } else {
                // 还没有激活，则重新发送邀请信
                member.status = 3;
                if(operateFlag){
                  sendEmail(user,callback);
                }
                else{
                  callback(null,member)
                }
                
              }
            }

          })
          .then(null, function (err) {
            member.status = '检查用户发生错误';
            log(err)
            callback(null,member)
          });
      }, function(err, result){
        res.send(result)
      });
    },
    getUserPhotosValidate: function (req, res, next) {
      donlerValidator({
        start: {
          name: '开始时间',
          value: req.query.start,
          validators: ['date']
        }
      }, 'fast', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },

    getUserPhotos: function (req, res) {

      var query = {
        'upload_user._id': req.params.userId,
        'hidden': false
      };
      if (req.query.start)  {
        query.upload_date = {
          '$lte': new Date(req.query.start).valueOf()
        };
      }

      Photo.find(query)
        .sort('-upload_date')
        .limit(21)
        .exec()
        .then(function (photos) {
          var aPhoto = photos[0];
          var role = auth.getRole(req.user, {
            companies: aPhoto.owner.companies,
            teams: aPhoto.owner.teams,
            users: [aPhoto.upload_user._id]
          });
          var allow = auth.auth(role, ['getUserPhotos']);
          if (!allow.getUserPhotos) {
            res.sendStatus(403);
            return;
          }

          var resPhotos = [];
          photos.forEach(function (photo) {
            resPhotos.push({
              _id: photo._id,
              name: photo.name,
              uri: photo.uri
            });
          });

          if (resPhotos.length > 20) {
            var nextPhoto = photos[20];
            resPhotos = resPhotos.slice(0, 20);
            res.status(200).send({
              photos: resPhotos,
              hasNext: true,
              nextDate: nextPhoto.upload_date
            });
          } else {
            res.status(200).send({
              photos: resPhotos,
              hasNext: false
            });
          }
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    getUserComments: function (req, res) {
      var srcUser = req.resourceUser;
      var role = auth.getRole(req.user, {
        companies: [srcUser.cid]
      });
      var allow = auth.auth(role, ['getUserComments']);
      if (!allow.getUserComments) {
        res.status(403).send({ msg: '您没有权限' });
        return;
      }
      Comment.find({'poster._id':req.params.userId})
        .sort('-create_date')
        .limit(10)
        .exec()
        .then(function (comments) {
          res.status(200).send(comments);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    }
  };
};


