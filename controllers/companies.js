'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var CompanyRegisterInviteCode = mongoose.model('CompanyRegisterInviteCode');

var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var util = require('util');
var async = require('async');

var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var auth = require('../services/auth.js');
var donlerValidator = require('../services/donler_validator.js');
var emailService = require('../services/email.js');

module.exports = function (app) {

  return {

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
      var salt = new Buffer(crypto.randomBytes(16).toString('base64'), 'base64');
      company.invite_key = crypto.pbkdf2Sync(Date.now().toString(), salt, 10000, 6).toString('base64');
      req.company = company;

      // todo 添加3个企业注册邀请码
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

    getCompanyById: function (req, res) {
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


    login: function (req, res) {
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).send({ msg: '缺少邮箱或密码' });
      }

      Company.findOne({
        username: req.body.username
      }).exec()
        .then(function (company) {
          if (!company) {
            return res.status(401).send({ msg: '邮箱或密码错误' });
          }

          if (!company.encryptPassword(req.body.password)) {
            return res.status(401).send({ msg: '邮箱或密码错误' });
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
              res.status(200).send({ token: token });
            }
          });

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },

    logout: function (req, res) {
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