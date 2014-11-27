'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');

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
    }

  };

};