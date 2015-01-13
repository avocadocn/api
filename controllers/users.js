'use strict';

var path = require('path');

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');
var Photo = mongoose.model('Photo');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var donlerValidator = require('../services/donler_validator.js');
var emailService = require('../services/email.js');
var uploader = require('../services/uploader.js');
var auth = require('../services/auth.js');
var tools = require('../tools/tools.js');
var syncData = require('../services/sync_data.js');

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
      var email = req.body.email;
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
            //这个邮箱没用过,可以注册
            return res.status(200).send({'active':1});
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

      var validateDepartment = function (name, value, callback) {
        if (!value) {
          callback(true);
          return;
        }
        var departments = req.company.department;
        for (var i = 0; i < value.length; i++) {
          var index = tools.arrayObjectIndexOf(departments, value[i], 'name');
          if (index === -1) {
            callback(false, '公司没有开设该部门');
            return;
          } else {
            departments = departments[index].department;
          }
        }
        callback(true);
      };

      donlerValidator({
        cid: {
          name: '公司id',
          value: req.body.cid,
          validators: ['required']
        },
        email: {
          name: '企业邮箱',
          value: req.body.email,
          validators: ['required', 'email', isUsedEmail]
        },
        domain: {
          name: '邮箱后缀',
          value: req.body.email.split('@')[1],
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
        department: {
          name: '部门',
          value: req.body.department,
          validators: [validateDepartment]
        },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number', donlerValidator.isLength(11)]
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
      var email = req.body.email;
      var user = new User({
        email: email,
        username: email,
        cid: req.company._id,
        cname: req.company.info.name,
        nickname: req.body.nickname,
        password: req.body.password,
        realname: req.body.realname,
        phone: req.body.phone,
        role: 'EMPLOYEE',
        invite_active: false
      });

      var inviteKeyValid = false;
      if (req.body.inviteKey && req.company.invite_key === req.body.inviteKey) {
        inviteKeyValid = true;
        user.invite_active = true;
      }

      user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }

        var emailSender;
        if (inviteKeyValid) {
          emailSender = emailService.sendStaffActiveMail;
        } else {
          emailSender = emailService.sendNewStaffActiveMail;
        }
        emailSender(user.email, user._id.toString(), user.cid.toString(), function (err) {
          if (err) {
            log(err);
            res.sendStatus(500);
          } else {
            res.sendStatus(201);
          }
        });
      });

    },

    forgetPassword: function (req, res) {
      User.findOne({email: req.body.email}, function(err, user) {
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

    getUserById: function (req, res) {
      //获取免打扰开关
      if(req.query.responseKey==='pushToggle') {
        var user = {'pushToggle' : req.user.push_toggle};
        return res.status(200).send(user);
      }
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
            var tids = [];
            user.team.forEach(function (team) {//不拿部门和公司
              if(team.entity_type!='virtual') tids.push(team._id);
            });

            var completeData = {
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
              campaignCount:user.campaignCount || 0
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
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    getCompanyUsers: function (req, res) {
      var findOptions = {'cid':req.params.companyId, 'active':true, 'mail_active':true};
      var outputOptions = {};
      if(req.user.provider==='company') { //hr取来任命队长用
        if(req.user._id.toString() !== req.params.companyId) return res.sendStatus(403);
        else {
          outputOptions = {'nickname':1,'photo':1};
        }
      }
      else if(req.user.cid.toString() !== req.params.companyId){
        return res.sendStatus(403);
      }else{//用户取来通讯录用
        outputOptions = {'email':1,'nickname':1};
      }
      User.find(findOptions,outputOptions)
      .sort('nickname')
      .exec()
      .then(function (users){
        return res.status(200).send(users);
      })
      .then(null, function (err){
        log(err);
        return res.status(500).send({msg:'查询错误'});
      })
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
        intro: {
          name: '简介',
          value: req.body.realname,
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
            res.sendStatus(500);
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
      if (req.body.intro) {
        user.introduce = req.body.intro;
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
        res.sendStatus(200);
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
        email: req.body.email
      }).exec()
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
          var token = jwt.sign({
            type: "user",
            id: user._id.toString(),
            exp: app.get('tokenExpires')
          }, app.get('tokenSecret'));

          user.app_token = token;
          user.token_device = tokenService.createTokenDevice(req.headers);
          user.addDevice(req.headers);
          user.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.status(200).send({
                token: token,
                id:user._id,
                cid:user.cid
              });
            }
          });

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    logout: function (req, res) {
      if (req.user.provider !== 'user') {
        res.sendStatus(403);
        return;
      }
      req.user.app_token = null;
      req.user.token_device = null;
      req.user.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
        } else {
          res.sendStatus(204);
        }
      });
    },

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
    }
  };
};
