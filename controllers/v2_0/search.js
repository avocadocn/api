'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');
var CompanyGroup = mongoose.model('CompanyGroup');
var User = mongoose.model('User');

module.exports = {
  searchCompanies: function(req, res) {
    var options = {};
    var companies_rst = [];
    var limit = req.body.limit || 10;
    var page = req.body.page || 1;
    if(req.body.name) {
      var regx = new RegExp(req.body.name);
      options = {'info.name': regx, 'status.active':true};
    }
    else if(req.body.city) {
      options = {'info.city.city':req.body.city ,'status.active':true}
    }
    else {
      return res.status(400).send({msg:'查询条件错误'});
    }
    var companies_rst = [];
    //查找未被屏蔽的公司
    Company.paginate(options, page, limit, function(err, pageCount, companies, itemCount) {
      if(err) {
        console.log(err);
        return res.status(500);
      }
      else {
        if(companies) {
          for(var i = 0; i < companies.length; i ++) {
            companies_rst.push({
              '_id' : companies[i]._id,
              'name' : companies[i].info.name,
              'logo' : companies[i].info.logo
            });
          }
          return res.status(200).send({companies:companies_rst, pageCount:pageCount});
        } else {
          return res.status(200).send([]);
        }
      }
    });
  }
};