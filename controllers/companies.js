'use strict';

var crypto = require('crypto');
var util = require('util');
var path = require('path');

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var User = mongoose.model('User');
var CompanyGroup = mongoose.model('CompanyGroup');
var Department = mongoose.model('Department');
var CompanyRegisterInviteCode = mongoose.model('CompanyRegisterInviteCode');
var Campaign = mongoose.model('Campaign');

var jwt = require('jsonwebtoken');
var async = require('async');

var log = require('../services/error_log.js');
var emailService = require('../services/email.js');
var tokenService = require('../services/token.js');
var auth = require('../services/auth.js');
var donlerValidator = require('../services/donler_validator.js');
var uploader = require('../services/uploader.js');
var syncData = require('../services/sync_data.js');
var tools = require('../tools/tools.js');



module.exports = function (app) {

  return {
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

    companyInfoValidate: function (req, res) {
      var option;
      if ( req.body.email ) {
        option = {'login_email': req.body.email};
      }
      else if ( req.query.username ) {
        option = {'username': req.body.username};
      }
      else if ( req.body.name){
        option = {'info.name': req.body.name};
      }
      else{
        return res.status(400).send({msg:'数据输入有误'});
      }
      Company.findOne(option, function(err, company) {
        if (err || company) {
          if(!req.body.name)
            res.send({ validate:0, msg:'已经存在' });
          else{//是验证的名字的话未验证邮箱提醒他去验证邮箱或给donler发送邮件
            if(company.status.mail_active && company.status.active) //没被屏蔽，邮箱也验证了
            res.send({ validate:0, msg:'已经存在'});
            else if(!company.status.mail_active)
              res.send({ validate:1, msg: '已被使用，未激活'});
            else if(!company.status.active)
              res.send({ validate:2, msg:'被屏蔽了，可使用'});
          }
        } else {
          res.send({ validate:3, msg:'可以使用' });
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
          value: req.body.email,
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
          email: req.body.email
        },
        login_email: req.body.email,
        email: {
          domain: [req.body.email.split('@')[1]]
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

        res.sendStatus(201);
      });

    },

    forgetPassword: function (req, res) {
      Company.findOne({
        login_email: req.body.email
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
              res.status(200).send({
                _id: company._id,
                username: company.username,
                domains: company.email.domain,
                name: company.info.name,
                shortName: company.info.official_name,
                logo: company.info.logo,
                province: company.info.city.province,
                city: company.info.city.city,
                district: company.info.city.district,
                address: company.info.address,
                contacts: company.info.contact,
                email: company.info.email,
                memberNumber: company.info.membernumber,
                companyInviteCodes: company.register_invite_code,
                staffInviteCode: company.invite_key
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
                staffInviteCode: company.invite_key
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
                memberNumber: company.info.membernumber
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
          value: req.body.email,
          validators: ['email']
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
    updateCompanyLogo: function (req, res, next) {
      if (req.headers['content-type'] !== 'multipart/form-data') {
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
        company.email.domain = req.body.domain.split(' ');
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
        company.info.city.linkman = req.body.contacts;
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
        company.info.email = req.body.email;
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

    getCompanyStatistics: function (req, res) {
      var option = {
        'cid':req.query.companyId || req.user.cid || req.user._id
      };
      if(req.user.provider=='user'){
        option.active = true;
      }
      if(req.query.target=='team') {
        option.gid = {
          '$ne': '0'
        }
      }
      else{
        option.gid = '0';
      }
      console.log(req.query.type);
      if(req.query.type === 'official' ) {
        option.poster = {role : 'HR'};
      }else if(req.query.type === 'unofficial') {
        option.poster = {role:'Personal'};
      }
      CompanyGroup
      .find(option)
      .exec()
      .then(function(companyGroups) {
        var formatCompanyGroups = [];
        for(var i = companyGroups.length-1; i>=0; i-- ) {
          var briefTeam = {
            _id: companyGroups[i]._id,
            name: companyGroups[i].name,
            cid: companyGroups[i].cid,
            cname: companyGroups[i].cname,
            logo: companyGroups[i].logo,
            groupType: companyGroups[i].group_type,
            active: companyGroups[i].active,
            brief: companyGroups[i].brief,
            score: companyGroups[i].score,
            count: companyGroups[i].count,
            memberCount: companyGroups[i].member.length
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

          var token = jwt.sign({
            type: "company",
            id: company._id.toString(),
            exp: app.get('tokenExpires')
          }, app.get('tokenSecret'));

          company.app_token = token;
          company.token_device = tokenService.createTokenDevice(req.headers);
          company.save(function (err) {
            if (err) {
              log(err);
              res.sendStatus(500);
            } else {
              res.status(200).send({ token: token,id:company._id });
            }
          });

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    logout: function (req, res) {
      if (req.user.provider !== 'company') {
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
    }

  };

};