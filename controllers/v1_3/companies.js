'use strict';

var crypto = require('crypto');
var util = require('util');
var path = require('path');

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var User = mongoose.model('User');
var CompanyGroup = mongoose.model('CompanyGroup');
var Group = mongoose.model('Group');
var Department = mongoose.model('Department');
var CompanyRegisterInviteCode = mongoose.model('CompanyRegisterInviteCode');
var Campaign = mongoose.model('Campaign');
var Report = mongoose.model('Report');
var jwt = require('jsonwebtoken');
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


module.exports = {
    getCompanyById: function (req, res, next) {
      Company.findOne({
        _id: req.params.companyId,
        'status.active': true
      }).exec()
        .then(function (company) {
          if (!company) {
            res.sendStatus(404);
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

    //验证用户正在注册时输入的信息
    companyInfoValidate: function (req, res) {
      var option;
      if(req.body.name) {
        option = {'info.name': req.body.name};
      }
      else if ( req.body.email ) {
        option = {'login_email': req.body.email.toLowerCase()};
      }
      else if ( req.body.username ) {//此步骤在邮箱认证后，故暂时在app中未用到
        option = {'username': req.body.username};
      }
      else{
        return res.status(400).send({msg:'数据输入有误'});
      }
      Company.findOne(option, function(err, company) {
        if (err || company) {
          if(err) {
            log(err);
            return res.status(500).send({msg:'数据库查找出错'});
          }
          if(!req.body.name)//验证email和username时只需返回是否存在
            res.send({ validate:0, msg:'已经存在' });
          else{//是验证的名字的话未验证邮箱提醒他去验证邮箱或给donler发送邮件
            if(company.status.mail_active && company.status.active) {//没被屏蔽，邮箱也验证了
              var domain = false;
              var emailDomain = req.body.email ? req.body.email.toLowerCase().split('@')[1] : null;
              if(emailDomain && company.email.domain.indexOf(emailDomain)>-1) {domain = true;}
              res.send({ validate:0, msg:'已经存在', cid:company._id, domain: domain});
            }
            else if(!company.status.mail_active)
              res.send({ validate:1, msg: '已被使用，未激活'});
            else if(!company.status.active)
              res.send({ validate:2, msg:'被屏蔽了，可使用'});
          }
        } else {
          res.status(200).send({ validate:3, msg:'可以使用' });
        }
      });
    },
    registerValidate: function (req, res, next) {

      var emailValidate = function (name, value, callback) {
        if (!value) {
          callback(true);
        }
        Company.findOne({ 'info.email': value }, { '_id': 1 }).exec()
          .then(function (company) {
            if (!company) {
              callback(true);
            } else {
              var msg = util.format('%s已被注册', name);
              callback(false, msg);
            }
          })
          .then(null, function (err) {
            log(err);
            var msg = util.format('验证%s时出错', name);
            callback(false, msg);
          });
      };

      var nameValidate = function (name, value, callback) {
        if (!value) {
          callback(true);
        }
        Company.findOne({ 'info.name': value }, { '_id': 1 }).exec()
          .then(function (company) {
            if (!company) {
              callback(true);
            } else {
              var msg = util.format('%s已被注册', name);
              callback(false, msg);
            }
          })
          .then(null, function (err) {
            log(err);
            var msg = util.format('验证%s时出错', name);
            callback(false, msg);
          });
      };

      var inviteCodeValidate = function (name, value, callback) {
        if (!value) {
          callback(true);
          return ;
        }
        CompanyRegisterInviteCode
          .findOne({
            code: value,
            status: 'active'
          }, { '_id': 1 })
          .exec()
          .then(function (code) {
            if (!code) {
              var msg = util.format('无效的%s', name);
              callback(false, msg);
            } else {
             callback(true);
            }
          })
          .then(null, function (err) {
            log(err);
            var msg = util.format('验证%s时出错', name);
            callback(false, msg);
          });
      };

      donlerValidator({
        name: {
          name: '公司名称',
          value: req.body.name,
          validators: ['required', nameValidate]
        },
        province: {
          name: '省份',
          value: req.body.province,
          validators: ['required']
        },
        city: {
          name: '城市',
          value: req.body.city,
          validators: ['required']
        },
        district: {
          name: '地区',
          value: req.body.district,
          validators: ['required']
        },
        region: {
          name: '省市区',
          value: req.body.province + ',' + req.body.city + ',' + req.body.district,
          validators: ['region']
        },
        address: {
          name: '详细地址',
          value: req.body.address,
          validators: ['required']
        },
        contacts: {
          name: '联系人',
          value: req.body.contacts,
          validators: ['required']
        },
        areacode: {
          name: '区号',
          value: req.body.areacode,
          validators: ['number']
        },
        tel: {
          name: '电话号码',
          value: req.body.tel,
          validators: ['required','number']
        },
        extension: {
          name: '分机',
          value: req.body.extension,
          validators: ['number']
        },
        email: {
          name: '企业邮箱',
          value: req.body.email.toLowerCase(),
          validators: ['required', 'email', emailValidate]
        },
        phone: {
          name: '联系人手机号码',
          value: req.body.phone,
          validators: ['number']
        },
        inviteCode: {
          name: '邀请码',
          value: req.body.inviteCode,
          validators: [inviteCodeValidate]
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

    register: function (req, res, next) {
      var email = req.body.email?req.body.email.toLowerCase():req.body.email;
      var company = new Company({
        info: {
          name: req.body.name,
          city: {
            province: req.body.province,
            city: req.body.city,
            district: req.body.district
          },
          address: req.body.address,
          lindline: {
            areacode: req.body.areacode,
            number: req.body.tel,
            extension: req.body.extension
          },
          linkman: req.body.contacts,
          phone: req.body.phone,
          email: email
        },
        login_email: email,
        email: {
          domain: [email.split('@')[1]]
        }
      });

      //生成随机邀请码
      company.invite_key = tools.randomAlphaNumeric(8);
      req.company = company;

      // 添加3个企业注册邀请码
      company.register_invite_code = [];
      var code_count = 0;
      async.whilst(
        function () {
          return code_count < 3;
        },
        function (callback) {
          var inviteCode = new CompanyRegisterInviteCode({
            company: company._id
          });
          inviteCode.save(function (err) {
            if (err) {
              callback(err);
            } else {
              company.register_invite_code.push(inviteCode.code);
              code_count++;
              callback();
            }
          });
        },
        function (err) {
          if (err) {
            log(err);
          }
          // 即使添加邀请码出错，也允许注册
          next();
        }
      );
    },

    registerSave: function (req, res) {
      var company = req.company;
      company.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }

        // 使用邀请码
        if (req.body.inviteCode) {
          CompanyRegisterInviteCode.findOne({
            'code': req.body.inviteCode
          })
            .populate('company')
            .exec()
            .then(function (code) {
              // 不再判断code是否存在，因为验证中间件已验证过了
              // 如果邀请码属于公司，则在公司邀请码列表中将其移除
              if (code.company) {
                var company = code.company;
                var removeIndex = company.register_invite_code.indexOf(code.code);
                company.register_invite_code.splice(removeIndex, 1);
                company.save(function (err) {
                  if (err) {
                    log(err);
                  }
                });
              }
              code.status = 'used';
              code.use_by_company = {
                '_id': company._id,
                'name': company.info.name,
                'email': company.info.email
              };
              code.save(function(err) {
                if (err) {
                  log(err);
                }
              });
            })
            .then(null, function (err) {
              log(err);
            });
        }
        //注册时创建hr账号，作为小队的管理员
        easemob.user.create({"username":company.id,"password":company.id});
        res.sendStatus(201);
      });

    },

    forgetPassword: function (req, res) {
      Company.findOne({
        login_email: req.body.email ? req.body.email.toLowerCase():req.body.email
      }, function(err, company) {
        if (err || !company) {
          return res.status(400).send({msg:'邮箱填写错误'});
        } else {
          emailService.sendCompanyResetPwdMail(company.login_email, company._id.toString(), function(err) {
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

    getCompany: function (req, res) {
      if (!req.params.companyId) {
        return res.status(400).send({ msg: '缺少companyId' });
      }

      Company.findById(req.params.companyId).exec()
        .then(function (company) {
          if (!company) {
            return res.status(404).send({ msg: '没有找到对应的公司' });
          }
          

          var role = auth.getRole(req.user, {
            companies: [company._id]
          });
          if(req.query.resonseKey==='inviteKey') {
            if(role.company==='hr'||role.company==='member'){
              return res.status(200).send({
                staffInviteCode: company.invite_key
              });
            }else{
              return res.status(403).send({msg:'权限错误'});
            }
          }

          switch (role.company) {
            case 'hr':
              var invite_key = encodeURIComponent(company.invite_key).replace(/'/g,"%27").replace(/"/g,"%22");
              var inviteUrl = req.headers.origin+'/users/invite?key='+invite_key+'&cid=' + company._id;
              res.status(200).send({
                _id: company._id,
                username: company.username,
                login_email: company.login_email,
                domains: company.email.domain,
                name: company.info.name,
                shortName: company.info.official_name,
                logo: company.info.logo,
                province: company.info.city.province,
                city: company.info.city.city,
                district: company.info.city.district,
                address: company.info.address,
                contacts: company.info.linkman,
                email: company.info.email,
                areacode: company.info.lindline.areacode,
                number: company.info.lindline.number,
                extension: company.info.lindline.extension,
                memberNumber: company.info.membernumber,
                companyInviteCodes: company.register_invite_code,
                staffInviteCode: company.invite_key,
                inviteUrl: inviteUrl,
                teamNumber: company.team.length,
                intro: company.info.brief,
                cover: company.info.cover,
                guide_step: company.guide_step || 0
              });
              break;
            case 'member':
              res.status(200).send({
                _id: company._id,
                domains: company.email.domain,
                name: company.info.name,
                shortName: company.info.official_name,
                logo: company.info.logo,
                province: company.info.city.province,
                city: company.info.city.city,
                district: company.info.city.district,
                address: company.info.address,
                email: company.info.email,
                memberNumber: company.info.membernumber,
                staffInviteCode: company.invite_key,
                intro: company.info.brief,
                cover: company.info.cover
              });
              break;
            default:
              res.status(200).send({
                _id: company._id,
                name: company.info.name,
                shortName: company.info.official_name,
                logo: company.info.logo,
                province: company.info.city.province,
                city: company.info.city.city,
                district: company.info.city.district,
                address: company.info.address,
                email: company.info.email,
                memberNumber: company.info.membernumber,
                intro: company.info.brief,
                cover: company.info.cover
              });
              break;
          }

        })
        .then(null, function (err) {
          log(err);
          res.status(500).send({ msg: '服务器错误' });
        });
    },
    updateCompanyValidate: function (req, res, next) {
      donlerValidator({
        name: {
          name: '简称',
          value: req.body.name,
          validators: [donlerValidator.minLength(1), donlerValidator.maxLength(20)]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: [donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        oldPassword: {
          name: '密码',
          value: req.body.oldPassword,
          validators: [donlerValidator.minLength(6), donlerValidator.maxLength(30)]
        },
        domain: {
          name: '邮箱后缀',
          value: req.body.domain,
          validators: [donlerValidator.minLength(1)]
        },
        province: {
          name: '省份',
          value: req.body.province,
          validators: [donlerValidator.maxLength(40)]
        },
        city: {
          name: '城市',
          value: req.body.city,
          validators: [donlerValidator.maxLength(40)]
        },
        district: {
          name: '区',
          value: req.body.district,
          validators: [donlerValidator.maxLength(40)]
        },
        address: {
          name: '地址',
          value: req.body.address,
          validators: [donlerValidator.maxLength(120)]
        },
        contacts: {
          name: '联系人',
          value: req.body.contacts,
          validators: [donlerValidator.maxLength(40)]
        },
        areacode: {
          name: '区号',
          value: req.body.areacode,
          validators: ['number', donlerValidator.maxLength(5)]
        },
        tel: {
          name: '电话号码',
          value: req.body.tel,
          validators: ['number', donlerValidator.maxLength(10)]
        },
        extension: {
          name: '分机',
          value: req.body.extension,
          validators: ['number', donlerValidator.maxLength(5)]
        },
        intro: {
          name: '简介',
          value: req.body.intro,
          validators: [donlerValidator.maxLength(70)]
        },
        phone: {
          name: '手机号码',
          value: req.body.phone,
          validators: ['number', donlerValidator.isLength(11)]
        },
        email: {
          name: '企业邮箱',
          value: req.body.email ? req.body.email.toLowerCase():req.body.email,
          validators: ['email']
        }
      }, 'complete', function (pass, msg) {
        if(req.body.password) {
          if(!req.body.oldPassword || !req.company.authenticate(req.body.oldPassword)) {
            return res.status(400).send({ msg: '您输入的旧密码错误' });
          }
        }


        if (pass) {
          next();
        } else {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
        }
      });
    },
    quickRegisterValidate: function (req, res, next) {

      var emailValidate = function (name, value, callback) {
        if (!value) {
          callback(true);
        }
        Company.findOne({ 'info.email': value }, { '_id': 1 }).exec()
          .then(function (company) {
            if (!company) {
              callback(true);
            } else {
              var msg = util.format('%s已被注册', name);
              callback(false, msg);
            }
          })
          .then(null, function (err) {
            log(err);
            var msg = util.format('验证%s时出错', name);
            callback(false, msg);
          });
      };

      donlerValidator({
        name: {
          name: '公司名称',
          value: req.body.name,
          validators: ['required']
        },
        province: {
          name: '省份',
          value: req.body.province,
          validators: ['required']
        },
        city: {
          name: '城市',
          value: req.body.city,
          validators: ['required']
        },
        district: {
          name: '地区',
          value: req.body.district,
          validators: ['required']
        },
        region: {
          name: '省市区',
          value: req.body.province + ',' + req.body.city + ',' + req.body.district,
          validators: ['region']
        },
        email: {
          name: '企业邮箱',
          value: req.body.email.toLowerCase(),
          validators: ['required', 'email', emailValidate]
        },
        password: {
          name: '密码',
          value: req.body.password,
          validators: ['required', donlerValidator.minLength(6), donlerValidator.maxLength(30)]
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
    quickRegister: function(req, res, next) {
      var email = req.body.email ?req.body.email.toLowerCase():req.body.email;
      var userDoc, companyDoc;

      companyDoc = new Company({
        username: email,
        login_email: email,
        password: req.body.password,
        status: {
          mail_active :false,
          active: false,
          verification: 1
        },
        info: {
          name: req.body.name,
          official_name: req.body.name,
          city: {
            province: req.body.province,
            city: req.body.city,
            district: req.body.district
          },
          email: email,
          membernumber: 1
        },
        email: {
          domain: email.split('@')[1]
        },
        invite_key: tools.randomAlphaNumeric(8)
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

        // 创建完公司，开始创建用户
        return User.create({
          username: email,
          password: req.body.password,
          nickname: email.split('@')[0],
          email: email,
          role: 'LEADER',
          cid: company._id,
          cname: req.body.name,
          company_official_name: req.body.name
        });
      })
      .then(function(user) {
        userDoc = user;
        res.send({
          msg: '注册成功',
          uid: user._id,
          inviteKey: companyDoc.invite_key,
          qrcodeUrl: companyDoc.invite_qrcode
        });
        //注册时创建hr账号，作为小队的管理员
        easemob.user.create({"username":companyDoc.id,"password":companyDoc.id});
        //注册时创建hr对应的个人账号
        easemob.user.create({"username":user.id,"password":user.id});
        emailService.sendQuickRegisterActiveMail(userDoc.email, companyDoc.info.name, companyDoc.id, function(err) {
          if(err) {console.log(err.stack);}
        });
      })
      .then(null, function(err) {
        if (err.typeError !== 'break') {
          next(err);
        }
      });
    },
    quickRegisterTeams: function(req, res) {
      var companyDoc, userDoc, groupDoc;

      if (!mongoose.Types.ObjectId.isValid(req.body.uid)) {
        res.status(400).send({
          msg: 'uid不是一个有效的id'
        });
        return;
      }

      // 采取抛出异常的方式中断Promise链
      var BreakError = function(msg) {
        this.typeError = 'break';
        Error.call(this, msg);
      };
      BreakError.prototype = Object.create(Error.prototype);
      User.findById(req.body.uid).exec()
        .then(function(user) {
          if (!user) {
            res.status(400).send({
              msg: 'uid无效'
            });
            throw new BreakError();
          }
          userDoc = user;
          return Group.find().exec();

        })
        .then(function(groups) {
          groupDoc = groups;
          return Company.findById(userDoc.cid).exec();
        })
        .then(function(company) {
          if (!company) {
            res.status(400).send({
              msg: 'uid无效'
            });
            throw new BreakError();
          }
          companyDoc = company;

          var teams = [];
          req.body.groups.forEach(function(group) {
            var groupIndex = tools.arrayObjectIndexOf(groupDoc, group._id, '_id');
            var team = new CompanyGroup({
              cid: companyDoc._id,
              gid: group._id,
              poster: {
                role: 'HR'
              },
              group_type: groupDoc[groupIndex].group_type,
              cname: companyDoc.info.name,
              name: companyDoc.info.name + '-' + groupDoc[groupIndex].group_type + '队',
              logo: '/img/icons/group/' + groupDoc[groupIndex].entity_type.toLowerCase() + '_on.png',
              entity_type: groupDoc[groupIndex].entity_type,
              city: {
                province: companyDoc.info.city.province,
                city: companyDoc.info.city.city,
                district: companyDoc.info.city.district
              },
              active: false,
              company_active: false,
              member: [{
                _id: userDoc._id,
                nickname: userDoc.nickname,
                photo: userDoc.photo,
              }],
              leader: [{
                _id: userDoc._id,
                nickname: userDoc.nickname,
                photo: userDoc.photo,
              }]
            });
            //创建群聊
            easemob.group.add({
              "groupname":team.id,
              "desc":team.brief,
              "public":true,
              "owner":team.cid,
              "members":[userDoc._id]
            },function (error,data) {
              if(error){
                log(error);
              }
              else{
                team.easemobId = data.data.groupid;
                team.save(function (error) {
                  log(error);
                })
              }
            });
            teams.push(team);
          });
          var createTeamsDeferred = Q.defer();
          // 文档和源码的注释都是骗人的吧，promise为啥只返回一个team，只能自己处理了
          CompanyGroup.create(teams, function(err) {
            if (err) createTeamsDeferred.reject(err);
            else {
              var result = [];
              for (var i = 1, len = arguments.length; i < len; i++) {
                result.push(arguments[i]);
              }
              createTeamsDeferred.resolve(result);
            }
          });
          return createTeamsDeferred.promise;
        })
        .then(function(teams) {
          userDoc.team = [];
          companyDoc.team = [];

          // 添加chatroom
          userDoc.chatrooms = [{
            _id: companyDoc._id
          }];
          // 把人加到小队并变成队长, 并把小队加到公司
          for (var i = 0, len = teams.length; i < len; i++) {
            var team = teams[i];
            userDoc.team.push({
              gid: team.gid,
              _id: team._id,
              group_type: team.group_type,
              entity_type: team.entity_type,
              name: team.name,
              leader: true,
              logo: team.logo
            });
            userDoc.chatrooms.push({
              _id: team._id
            });
            companyDoc.team.push({
              gid: team.gid,
              group_type: team.group_type,
              name: team.name,
              id: team._id
            });
          }
          var saveUserDeferred = Q.defer();
          userDoc.save(function(err) {
            if (err) saveUserDeferred.reject(err);
            else saveUserDeferred.resolve();
          });

          var saveCompanyDeferred = Q.defer();
          companyDoc.save(function(err) {
            if (err) saveCompanyDeferred.reject(err);
            else saveCompanyDeferred.resolve();
          });
          return Q.all([saveUserDeferred.promise, saveCompanyDeferred.promise]);
        })
        .then(function() {
          res.status(200).send({
            result: 1,
            msg: '注册成功'
          });
        })
        .then(null, function(err) {
          if (err.typeError !== 'break') {
            next(err);
          }
        });
    },
    updateCompanyLogo: function (req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }
      uploader.uploadImg(req, {
        fieldName: 'logo',
        targetDir: '/public/img/company/logo',
        success: function (url, oriName) {
          req.company.info.logo = path.join('/img/company/logo', url);
          next();
        },
        error: function (err) {
          if (err.type === 'notfound') {
            next();
          } else {
            res.sendStatus(500);
          }
        }
      });
    },
    updateCompanyCover: function(req, res) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        return res.status(400).send({
          msg: '请求数据错误'
        });
      }
      if(req.company.id !== req.user.id) {
        return res.status(403).send({msg:'权限错误'});
      }
      uploader.uploadImg(req, {
        fieldName: 'cover',
        targetDir: '/public/img/company/cover',
        success: function(url, oriName) {
          var companyCoverUrl = path.join('/img/company/cover', url);
          Company.findByIdAndUpdate(req.company.id, {
            'info.cover': companyCoverUrl
          }, function(err) {
            if(err) {
              res.sendStatus(500);
            } else {
              res.sendStatus(200);
            }
          });
        },
        error: function(err) {
          console.log(err);
          res.sendStatus(500);
        }
      });
    },
    updateCompany: function (req, res) {
      var role = auth.getRole(req.user, {
        companies: [req.company._id]
      });
      var allow = auth.auth(role, ['editCompany']);
      if (!allow.editCompany) {
        res.sendStatus(403);
        return;
      }
      var company = req.company;
      if (req.body.name) {
        company.info.official_name = req.body.name;
      }
      if (req.body.password) {
        company.password = req.body.password;
      }
      if (req.body.domain) {
        //去重，最多三个
        var newDomain = req.body.domain.split(' ');
        var sortedDomain = newDomain.sort();
        var results = [];
        for (var i = 0; i < sortedDomain.length; i++) {
          if (sortedDomain[i + 1] !== sortedDomain[i]) {
            results.push(sortedDomain[i]);
          }
        }
        company.email.domain = results.slice(0,3);
      }
      if (req.body.province) {
        company.info.city.province = req.body.province;
      }
      if (req.body.city) {
        company.info.city.city = req.body.city;
      }
      if (req.body.district) {
        company.info.city.district = req.body.district;
      }
      if (req.body.address) {
        company.info.address = req.body.address;
      }
      if (req.body.contacts) {
        company.info.linkman = req.body.contacts;
      }
      if (req.body.areacode) {
        company.info.lindline.areacode = req.body.areacode;
      }
      if (req.body.tel) {
        company.info.lindline.number = req.body.tel;
      }
      if (req.body.extension) {
        company.info.lindline.extension = req.body.extension;
      }

      if (req.body.intro) {
        company.info.brief = req.body.intro;
      }
      if (req.body.phone) {
        company.info.phone = req.body.phone;
      }
      if (req.body.email) {
        company.info.email = req.body.email.toLowerCase();
      }
      if (req.body.guide_step) {
        company.guide_step = req.body.guide_step;
      }
      company.save(function (err) {
        if (err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
        if (req.body.name) {
          syncData.updateCname(company._id);
        }
      });
    },
    getCompanyUndisposed: function (req, res) {
      //查询公司没有任命队长的小队和待激活的员工
      async.parallel({
        noLeaderTeams: function(callback) {
          CompanyGroup.find({
            'cid': req.params.companyId,
            'leader':[],
            'gid': {'$ne':0},
            'active': true
          }, function (err, teams) {
            if(err) {
              callback(err);
            }
            else {
              callback(null,teams.length);
            }
          });
        },
        unActivatedUsers: function(callback) {
          User.find({
            'cid': req.params.companyId,
            'mail_active': false,
            'invited':{"$ne":true}
          }, function (err, users) {
            if(err) {
              callback(err);
            }
            else {
              callback(null, users.length);
            }
          })
        }
      }, function(err, results) {
        if(err) {
          log(err);
          res.sendStatus(500);
          return;
        }
        else {
          res.status(200).send(results);
        }
      }); 
    },

    getCompanyStatistics: function (req, res) {
      if(req.user._id.toString() !== req.params.companyId ) {
        return res.status(403).send({msg:'权限错误'});
      }
      var option = {'cid':req.params.companyId};
      if(req.query.target=='team') {//查小队
        option.gid = {'$ne': '0'};
      }
      else{//查部门
        option.gid = '0';
      }
      if(req.query.type === 'official' ) {//查看官方小队
        option.poster = {role : 'HR'};
      }else if(req.query.type === 'unofficial') {//查看非官方小队
        option.poster = {role : 'Personal'};
      }
      CompanyGroup
      .find(option)
      .sort('score.total')
      .exec()
      .then(function(companyGroups) {
        var formatCompanyGroups = [];
        for(var i = companyGroups.length-1; i>=0; i-- ) {
          var briefTeam = {
            _id: companyGroups[i]._id,
            name: companyGroups[i].name,
            cid: companyGroups[i].cid,
            gid: companyGroups[i].gid,
            cname: companyGroups[i].cname,
            logo: companyGroups[i].logo,
            groupType: companyGroups[i].group_type,
            active: companyGroups[i].active,
            brief: companyGroups[i].brief,
            score: companyGroups[i].score,
            count: companyGroups[i].count,
            memberCount: companyGroups[i].member.length,
            leader: companyGroups[i].leader
          };
          if(req.query.target=='department'){
            briefTeam.did = companyGroups[i].department;
          }
          formatCompanyGroups.push(briefTeam);
        }
        return res.status(200).send(formatCompanyGroups);
      })
      .then(null, function(err) {
        log(err);
        res.sendStatus(500);
      });
    },

    // 获取图表相关统计信息
    getCompanyCharts: function (req, res, next) {

      var role = auth.getRole(req.user, {
        companies: [req.params.companyId]
      });
      var allow = auth.auth(role, ['getCompanyStatistics']);
      if (!allow.getCompanyStatistics) {
        return res.status(403).send({ msg: '权限不足' });
      }

      var total = 5; // 统计5周数据
      var queryDateList = [];
      // 最近5周时间的查询分界点
      var nowWeek = moment().isoWeek();
      for (var i = total - 1; i >= -1; i--) {
        queryDateList.push(moment().isoWeek(nowWeek - i).day(0).valueOf());
      }
      // 生成查询条件
      var queryList = [];
      for (var i = 0; i < total; i++) {
        queryList.push({
          start_time: {
            $gte: new Date(queryDateList[i]),
            $lt: new Date(queryDateList[i + 1])
          }
        });
      }

      var queryForBar = function () {
        // todo 这里需要查询10次数据库！需要改进
        // 如果精通mongodb的管道操作，或许可以将查询次数变为一次，至少可以变为5次
        // 统计数据绝对不适宜将数据全取出，即使是取文档的一小部分，然后通过js去计算，这样虽然只查询一次，但效率不高且不安全，尽管实际的公司活动和人次不会很多
        // 查询只要没有上限，就是不安全的，故先采取查询10次的方法，这是安全的，尽管会增加数据库压力
        // 查询total * 2次数据库，获取统计数据
        async.map(queryList, function (query, mapCallback) {

          async.parallel({
            members: function (parallelCallback) {
              Campaign.aggregate()
                .match({
                  active: true,
                  cid: req.user.getCid(),
                  start_time: query.start_time
                })
                .unwind('campaign_unit')
                .unwind('campaign_unit.member')
                .group({
                  _id: null,
                  count: { $sum: 1 }
                })
                .project({
                  _id: 0,
                  count: 1
                })
                .exec()
                .then(function (result) {
                  parallelCallback(null, result);
                })
                .then(null, function (err) {
                  parallelCallback(err);
                });
            },
            campaigns: function (parallelCallback) {
              Campaign.aggregate()
                .match({
                  active: true,
                  cid: req.user.getCid(),
                  start_time: query.start_time
                })
                .group({
                  _id: null,
                  count: { $sum: 1 }
                })
                .project({
                  _id: 0,
                  count: 1
                })
                .exec()
                .then(function (result) {
                  parallelCallback(null, result);
                })
                .then(null, function (err) {
                  parallelCallback(err);
                });
            }
          }, function (err, results) {
            mapCallback(err, results);
          });
          // Campaign.aggregate()
          //   .match({
          //     active: true,
          //     cid: req.user.getCid(),
          //     start_time: query.start_time
          //   })
          //   .unwind('campaign_unit')
          //   .match({
          //     'campaign_unit.company': req.user.getCid(),
          //   })
          //   .group({
          //     _id:$_id,
          //     members: { $addToSet: "$campaign_unit.member" }
          //   })
          //   .project({
          //     count: { $sum: 1 },
          //     memberCount: { $sum: { $size: "$members" } }
          //   })
          //   .exec()
          //   .then(function (result) {
          //     mapCallback(null, result);
          //   })
          //   .then(null, function (err) {
          //     mapCallback(err);
          //   });

        }, function (err, results) {
          if (err) {
            next(err);
          } else {
            // 将结果转换为两个数组
            var campaignCounts = [], memberCounts = [];
            results.forEach(function (result) {
              campaignCounts.push(result.count);
              memberCounts.push(result.memberCount);
            });
            res.send({
              chartsData: {
                campaignCounts: campaignCounts,
                memberCounts: memberCounts
              },
              splitDate: queryDateList
            });
          }
        });
      }

      var queryForPie = function () {
        async.map(queryList, function (query, mapCallback) {

          var calRes = {
            once: 0,
            twice: 0,
            moreThanThreeTimes: 0
          };

          async.waterfall([
            function (waterfallCallback) {
              // 获取参加了一次活动及以上的人数
              Campaign.aggregate()
                .match({
                  active: true,
                  cid: req.user.getCid(),
                  start_time: query.start_time
                })
                .unwind('campaign_unit')
                .unwind('campaign_unit.member')
                .group({
                  _id: '$campaign_unit.member._id',
                  count: { $sum: 1 }
                })
                .project({
                  _id: 1,
                  count: 1
                })
                .exec()
                .then(function (result) {

                  result.forEach(function (item) {
                    if (item.count === 1) {
                      calRes.once++;
                    } else if (item.count === 2) {
                      calRes.twice++;
                    } else if (item.count >= 3) {
                      calRes.moreThanThreeTimes++;
                    }
                  });

                  var ids = result.map(function (item) {
                    return item._id;
                  });
                  waterfallCallback(null, ids);
                })
                .then(null, function (err) {
                  waterfallCallback(err);
                });
            },
            function (ids, waterfallCallback) {
              // 统计一次都没有参加的
              User.find({
                cid: req.user.getCid(),
                _id: {
                  $not: {
                    $in: ids
                  }
                }
              })
                .count()
                .exec()
                .then(function (count) {
                  calRes.zero = count;
                  waterfallCallback();
                })
                .then(null, function (err) {
                  waterfallCallback(err);
                });
            }
          ], function (err, results) {
            mapCallback(err, calRes);
          });

        }, function (err, results) {
          if (err) {
            next(err);
          } else {
            res.send({ chartsData: results, splitDate: queryDateList });
          }
        });
      };

      switch (req.query.chart) {
      case 'bar':
        queryForBar();
        break;
      case 'pie':
        queryForPie();
        break;
      default:
        res.status(400).send({ msg: '请求的图表类型有误' });
      }

    },

    //与users路由中中获取公司成员重复，此功能待需求及重写.
    //app中暂时没有用到此路由、此功能.
    getCompanyMembers: function (req, res) {
      User.find({
        cid: req.params.companyId
      }).exec()
        .then(function (users) {
          var resUsers = [];
          users.forEach(function (user) {
            resUsers.push({
              _id: user._id,
              nickname: user.nickname,
              photo: user.photo
            });
          });
          res.status(200).send(resUsers);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    // 获取最近加入的成员
    getLatestMembers: function(req, res, next) {
      var limit = 12;
      User.find({
        cid: req.params.companyId,
        active: true,
        mail_active: true
      }, {
        email: 1,
        nickname: 1,
        realname: 1,
        photo: 1,
        register_date: 1
      })
        .sort('-register_date')
        .limit(limit)
        .exec()
        .then(function(users) {
          res.send({msg: '获取用户列表成功', users: users});
        })
        .then(null, next);
    },

    getCompanyReportedMembers: function (req, res) {
      Report.find({
        host_type:'user',
        'content_poster.cid': req.params.companyId,
        status:'verifying',
        hr_status:'verifying'
      }).populate('content_poster.uid')
      .exec()
        .then(function (reports) {
          var resUsers = [];
          reports.forEach(function (report) {
            var _user = {
              _id:report.content_poster.uid._id,
              username:report.content_poster.uid.username,
              nickname:report.content_poster.uid.nickname
            }
            resUsers.push({
              user: _user,
              report_date: report.create_date
            });
          });
          res.status(200).send(resUsers);
        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    getCompanyDepartments: function (req, res) {
      var option = {
        'company._id': req.params.companyId
      };
      if(req.user.provider=='user'){
        option.status = 'active';
      }
      Department
      .find(option)
      .exec()
      .then(function(departments) {
        var departmentList = [];
        for (var i = 0; i < departments.length; i++) {
          departmentList.push({
            _id: departments[i]._id,
            tid: departments[i].team,
            name: departments[i].name,
            manager: departments.manager
          });
        }
        res.status(200).send(departmentList);
      })
      .then(null, function(err) {
        log(err);
        res.sendStatus(500);
      });
    },

    getCompanyTags: function (req, res) {
      Campaign.aggregate()
      .project({"tags":1,"campaign_type":1,"cid":1})
      .match({$and: [
        {'cid' : mongoose.Types.ObjectId(req.params.companyId)},
        {'campaign_type':1}
        ]})//可在查询条件中加入时间
      .unwind("tags")
      .group({_id : "$tags", number: { $sum : 1} })
      .sort({number:-1})
      .limit(10)
      .exec(function(err,result){
          if (err) {
            log(err);
            res.sendStatus(500);
          }
          else{
            return res.status(200).send(result);
          }
      });
    },

    login: function (req, res) {
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).send({ msg: '缺少邮箱或密码' });
      }

      Company.findOne({
        username: req.body.username
      }).exec()
        .then(function (company) {
          if (!company) {
            return res.status(401).send({ msg: '用户不存在，请检查您的用户名' });
          }

          if (!company.authenticate(req.body.password)) {
            return res.status(401).send({ msg: '密码错误,请重新输入' });
          }

          if( !company.status.mail_active) {
            return res.status(401).send({ msg: '您的公司账号尚未激活,请到邮箱内激活' });
          }

          if(!company.status.active) {
            return res.status(401).send({ msg: '您的公司账号已被关闭' });
          }

          var payload = {
            type: "company",
            id: company._id.toString(),
            exp: req.app.get('tokenExpires') + Date.now()
          };
          var token = jwt.sign(payload, req.app.get('tokenSecret'));
          company.addDevice(req.headers, token);
          company.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              // mgcid: manager company id for hr manager
              req.session.mgcid = company.id;

              res.status(200).send({ token: token, id:company._id });

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
          req.session.touch();
        })
        .then(null, function(err) {
          var newToken = jwt.sign({
            type: "company",
            id: req.user._id.toString(),
            exp: req.app.get('tokenExpires') + Date.now()
          }, req.app.get('tokenSecret'));
          req.user.updateDeviceToken(req.headers['x-access-token'], newToken);
          req.user.save(function(err) {
            if (err) next(err);
            else {
              res.send({
                msg: '更新成功',
                newToken: newToken
              });
              req.session.touch();
            }
          });
        });
    },

    logout: function (req, res) {
      if (req.user.provider !== 'company') {
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
          req.session.destroy();

          res.sendStatus(204);

          tokenService.redisToken.delete(token)
            .then(null, console.log);
        }
      });
    },

    hasLeader: function(req, res, next) {
      CompanyGroup.find({cid: req.params.companyId}, {leader: 1}).exec()
        .then(function(teams) {
          var hasLeader = false;
          for (var i = 0, len = teams.length; i < len; i++) {
            if (teams[i].leader && teams[i].leader.length > 0) {
              hasLeader = true;
              break;
            }
          }
          res.send({hasLeader: hasLeader});
        })
        .then(null, next);
    }

};