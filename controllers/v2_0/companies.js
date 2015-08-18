'use strict';

var crypto = require('crypto');
var util = require('util');
var path = require('path');

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var User = mongoose.model('User');
var async = require('async');
var moment = require('moment');
var Q = require('q');

var log = require('../../services/error_log.js');
var emailService = require('../../services/email.js');
var tokenService = require('../../services/token.js');
var auth = require('../../services/auth.js');
var donlerValidator = require('../../services/donler_validator.js');
var uploader = require('../../services/uploader.js');
var syncData = require('../../services/sync_data.js');
var tools = require('../../tools/tools.js');
var qrcodeService = require('../../services/qrcode');
var easemob = require('../../services/easemob.js');
var multiparty = require('multiparty');

module.exports = {
  validateSuperAdmin: function(req, res, next) {
    if(req.user.isSuperAdmin(req.params.companyId)) {
      next();
    }
    else {
      return res.status(403).send({msg:'权限不足'});
    }
  },

  getCompany: function(req, res) {
    //todo 判断从app来or网页来
    var isAdmin = false;
    var outputOptions = {};
    if(isAdmin) {
      outputOptions = {status:1, team:1, info:1};
    }
    else {
      outputOptions = {info:1};
    }
    Company.findOne({_id:req.params.companyId, 'status.active':true}, outputOptions, function(err, company) {
      if(err) {
        log(err);
        return res.status(500).send({msg:'公司查找错误'});
      }
      else {
        return res.status(200).send({company: company});
      }
    });
  },

  quickRegisterValidate: function(req, res, next) {

    var emailValidate = function(name, value, callback) {
      if (!value) {
        callback(true);
      }
      Company.findOne({
          'info.email': value
        }, {
          '_id': 1
        }).exec()
        .then(function(company) {
          if (!company) {
            callback(true);
          } else {
            var msg = util.format('%s已被注册', name);
            callback(false, msg);
          }
        })
        .then(null, function(err) {
          log(err);
          var msg = util.format('验证%s时出错', name);
          callback(false, msg);
        });
    };

    var nameValidate = function(name, value, callback) {
      if (!value) {
        callback(true);
      }
      Company.findOne({
          'info.name': value
        }, {
          '_id': 1
        }).exec()
        .then(function(company) {
          if (!company) {
            callback(true);
          } else {
            var msg = util.format('%s已被注册', name);
            callback(false, msg);
          }
        })
        .then(null, function(err) {
          log(err);
          var msg = util.format('验证%s时出错', name);
          callback(false, msg);
        });
    };
    var fieldName = 'photo';
    var form = new multiparty.Form({
      uploadDir: uploader.tempDir
    });

    form.parse(req, function(err, fields, files) {
      if (err) {
        log(err);
        return res.sendStatus(500);
      }
      req.registerInfo = {};

      req.registerInfo.name = (fields['name'] && fields['name'][0]) ? fields['name'][0] : undefined;
      req.registerInfo.email = (fields['email'] && fields['email'][0]) ? fields['email'][0].toLowerCase() : undefined;
      req.registerInfo.password = (fields['password'] && fields['password'][0]) ? fields['password'][0] : undefined;
      req.registerInfo.gender = (fields['gender'] && fields['gender'][0]) ? fields['gender'][0] : undefined;
      // req.registerInfo.photo = (files['photo'] && files['photo'][0].originalFilename) ? files['photo'][0].originalFilename : undefined;

      req.photoFile = (files['photo'] && files['photo'][0].originalFilename) ? files['photo'][0] : undefined;
      // TODO: 验证头像信息
      donlerValidator({
        name: {
          name: '公司名称',
          value: req.registerInfo.name,
          validators: ['required', nameValidate]
        },
        email: {
          name: '企业邮箱',
          value: req.registerInfo.email,
          validators: ['required', 'email', emailValidate]
        },
        password: {
          name: '密码',
          value: req.registerInfo.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        gender: {
          name: '性别',
          value: req.registerInfo.gender,
          validators: ['required']
        }
        // photo: {
        //   name: '头像',
        //   value: req.registerInfo.photo,
        //   validators: ['required']
        // }
      }, 'complete', function(pass, msg) {
        if (pass) {
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
   * 上传头像
   * @param  {[type]}   req  [description]
   * @param  {[type]}   res  [description]
   * @param  {Function} next [description]
   * @return {[type]}        [description]
   */
  uploadPhotoForUser: function(req, res, next) {
    if (!req.photoFile) {
      // 不传照片的话直接到下一步
      next();
      return;
    }

    uploader.uploadImage(req.photoFile, {
      targetDir: '/public/img/user/photo',
      saveOrigin: true,
      getSize: true,
      success: function(imgInfo, oriCallback) {
        req.registerInfo.photo = imgInfo.url;
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

  quickRegister: function(req, res, next) {
    var userDoc, companyDoc;

    companyDoc = new Company({
      username: req.registerInfo.email,
      login_email: req.registerInfo.email,
      password: req.registerInfo.password,
      status: {
        mail_active: false,
        active: false,
        verification: 1
      },
      info: {
        name: req.registerInfo.name,
        official_name: req.registerInfo.name,
        email: req.registerInfo.email,
        membernumber: 1
      },
      email: {
        domain: req.registerInfo.email.split('@')[1]
      }
    });

    var deferred = Q.defer();

    var qrDir = '/img/qrcode/companyinvite/';
    var fileName = companyDoc.id + '.png';
    var inviteUrl = req.headers.host + '/users/invite?key=' + companyDoc.invite_key + '&cid=' + companyDoc.id;
    qrcodeService.generateCompanyQrcode(qrDir, fileName, inviteUrl, function(err, qrcodeUrl) {
      if (err) deferred.reject(err);
      else deferred.resolve(qrcodeUrl);
    });

    deferred.promise
      .then(function(qrcodeUrl) {
        companyDoc.invite_qrcode = qrcodeUrl;
        return Company.create(companyDoc);
      })
      .then(function(company) {
        companyDoc = company;
        var user = {
          username: req.registerInfo.email,
          password: req.registerInfo.password,
          email: req.registerInfo.email,
          cid: company._id,
          cname: req.registerInfo.name,
          company_official_name: req.registerInfo.name
        };
        if (req.registerInfo.photo) {
          user.photo = req.registerInfo.photo;
        }
        // 创建完公司，开始创建用户
        return User.create(user);
      })
      .then(function(user) {
        userDoc = user;
        res.send({
          msg: '注册成功',
          uid: user._id,
          // inviteKey: companyDoc.invite_key,
          qrcodeUrl: companyDoc.invite_qrcode
        });
        //注册时创建hr账号，作为小队的管理员
        easemob.user.create({
          "username": companyDoc.id,
          "password": companyDoc.id
        });
        //注册时创建hr对应的个人账号
        easemob.user.create({
          "username": user.id,
          "password": user.id
        });
        emailService.sendQuickRegisterActiveMail(userDoc.email, companyDoc.info.name, companyDoc.id, function(err) {
          if (err) {
            console.log(err.stack);
          }
        });
      })
      .then(null, function(err) {
        if (err.typeError !== 'break') {
          next(err);
        }
      });
  }
};