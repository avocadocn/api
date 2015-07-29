'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Company = mongoose.model('Company');

var log = require('../../services/error_log.js'),
    donlerValidator = require('../../services/donler_validator.js'),
    uploader = require('../../services/uploader.js'),
    tools = require('../../tools/tools.js');
var publicDomain = require('../../services/public_domain.js');
var emailService = require('../../services/email.js');
var multiparty = require('multiparty');

module.exports = {
      /**
     * 解析注册用户formData
     * @param  {[type]}   req  [description]
     * @param  {[type]}   res  [description]
     * @param  {Function} next [description]
     * @return {[type]}        [description]
     */
    getFormData: function(req, res, next) {
      var fieldName = 'photo';
      var form = new multiparty.Form({
        uploadDir: uploader.tempDir
      });

      form.parse(req, function(err, fields, files) {
        if (err) {
          log(err);
          return res.sendStatus(500);
        }
        req.userInfo = {};

        req.userInfo.cid = (fields['cid'] && fields['cid'][0]) ? fields['cid'][0] : undefined;
        req.userInfo.email = (fields['email'] && fields['email'][0]) ? fields['email'][0].toLowerCase() : undefined;
        req.userInfo.password = (fields['password'] && fields['password'][0]) ? fields['password'][0] : undefined;
        req.userInfo.gender = (fields['gender'] && fields['gender'][0]) ? fields['gender'][0] : undefined;
        // req.userInfo.photo = (files['photo'] && files['photo'][0].originalFilename) ? files['photo'][0].originalFilename : undefined;

        req.photoFile = (files['photo'] && files['photo'][0].originalFilename) ? files['photo'][0] : undefined;;
        
        next();
      });
    },
    getCompanyByCid: function (req, res, next) {
      if (!req.userInfo.cid) {
        res.status(400).send({ msg: 'cid不能为空' });
        return;
      }

      Company.findById(req.userInfo.cid).exec()
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

      donlerValidator({
        cid: {
          name: '公司id',
          value: req.userInfo.cid,
          validators: ['required']
        },
        email: {
          name: '企业邮箱',
          value: req.userInfo.email,
          validators: ['required', 'email', isUsedEmail]
        },
        domain: {
          name: '邮箱后缀',
          value: req.userInfo.email? req.userInfo.email.split('@')[1] : undefined,
          validators: [validateDomain]
        },
        password: {
          name: '密码',
          value: req.userInfo.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        gender: {
          name: '性别',
          value: req.userInfo.gender,
          validators: ['required']
        }
        // photo: {
        //   name: '头像',
        //   value: req.userInfo.photo,
        //   validators: ['required']
        // }
      }, 'complete', function (pass, msg) {
        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
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
          req.userInfo.photo = imgInfo.url;
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
    register: function (req, res) {
      var user = new User({
        email: req.userInfo.email,
        username: req.userInfo.email,
        cid: req.company._id,
        cname: req.company.info.name,
        password: req.userInfo.password,
        gender: req.userInfo.gender
      });

      if (req.userInfo.photo) {
        user.photo = req.userInfo.photo;
      }
      
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
    },
    validateConcern: function (req, res, next) {
      donlerValidator({
        concern:{
          name: '关注人id',
          value: req.params.userId,
          validators: [donlerValidator.inDatabase('User', '关注者不存在')]
        }
      }, 'complete', function (pass, msg) {
        if(!pass) {
          var msg = donlerValidator.combineMsg(msg);
          return res.status(400).send({msg:msg});
        }
        else {
          next();
        }
      })
    },
    addConcern: function (req, res) {
      var newConcern = {
        user: req.params.userId,
        createTime: new Date()
      }
      if(!req.user.concern) {
        req.user.concern = [newConcern];
      }
      else {
        var index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
        if(index === -1) {
          req.user.concern.push(newConcern);
        }
        else {
          return res.status(200).send({msg:'已关注过'});
        }
      }
      req.user.save(function(err) {
        if(err) {
          log(err);
          return res.status(500).send({msg:'保存出错'});
        }
        else{
          return res.status(200).send({msg:'添加关注成功'});
        }
      });
    },
    getConcern: function (req, res) {
      //暂时只能获取自己的
      return res.status(200).send({concern: req.user.concern});
    },
    deleteConcern: function (req, res) {
      var index = -1;
      if(req.user.concern){
        index = tools.arrayObjectIndexOf(req.user.concern, req.params.userId, 'user');
      }
      console.log(req.user.concern);
      console.log(index);
      if(index>-1) {
        req.user.concern.splice(index,1);
        req.user.save(function (err) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'保存出错'});
          }
          else{
            return res.status(200).send({msg:'取消关注成功'});
          }
        });
      }
      else {
        return res.status(200).send({msg:'取消关注成功'});
      }
    }
};