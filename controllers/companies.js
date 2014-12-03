'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');

var jwt = require('jsonwebtoken');
var log = require('../services/error_log.js');
var tokenService = require('../services/token.js');
var auth = require('../services/auth.js');

module.exports = function (app) {

  return {

    getCompanyById: function (req, res) {
      if (!req.params.companyId) {
        return res.status(400).send('缺少companyId');
      }

      Company.findById(req.params.companyId).exec()
        .then(function (company) {
          if (!company) {
            return res.status(404).send('没有找到对应的公司');
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
          res.status(500).send('服务器错误');
        });
    },


    login: function (req, res) {
      if (!req.body || !req.body.username || !req.body.password) {
        return res.status(400).send('缺少邮箱或密码');
      }

      Company.findOne({
        username: req.body.username
      }).exec()
        .then(function (company) {
          if (!company) {
            return res.status(401).send('邮箱或密码错误');
          }

          if (!company.encryptPassword(req.body.password)) {
            return res.status(401).send('邮箱或密码错误');
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