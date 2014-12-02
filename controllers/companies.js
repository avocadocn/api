'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var jwt = require('jsonwebtoken');

module.exports = function (app) {

  return {

    getCompanyById: function (req, res) {
      if (!req.params.companyId) {
        return res.send(400, '缺少companyId');
      }

      Company.findById(req.params.companyId).exec()
        .then(function (company) {
          if (!company) {
            return res.send(404, '没有找到对应的公司');
          }

          // todo get role
          var role = 'hr';
          switch (role) {
            case 'hr':
              res.send(200, {
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
                memberNumber: company.member_number,
                companyInviteCodes: company.register_invite_code,
                staffInviteCode: company.invite_key
              });
              break;
            case 'member':
              res.send(200, {
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
                memberNumber: company.member_number,
                staffInviteCode: company.invite_key
              });
              break;
            default:
              res.send(200, {
                _id: company._id,
                name: company.info.name,
                shortName: company.info.official_name,
                logo: company.info.logo,
                province: company.info.city.province,
                city: company.info.city.city,
                district: company.info.city.district,
                address: company.info.address,
                email: company.info.email,
                memberNumber: company.member_number
              });
              break;
          }

        })
        .then(null, function (err) {
          // todo add to log
          console.log(err);
          res.send(500, '服务器错误');
        });
    },


    login: function (req, res) {
      if (!req.body || !req.body.username || !req.body.password) {
        return res.send(400, '缺少邮箱或密码');
      }

      Company.findOne({
        username: req.body.username
      }).exec()
        .then(function (company) {
          if (!company) {
            return res.send(401, '邮箱或密码错误');
          }

          if (!company.encryptPassword(req.body.password)) {
            return res.send(401, '邮箱或密码错误');
          }

          var token = jwt.sign({
            type: "company",
            id: company._id.toString(),
            exp: app.get('tokenExpires')
          }, app.get('tokenSecret'));

          res.send(200, {
            token: token
          });

        })
        .then(null, function (err) {
          // todo temp err handle
          console.log(err);
          res.sendStatus(500);
        });
    }

  };

};