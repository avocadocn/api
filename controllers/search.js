'use strict';

var mongoose = require('mongoose');
var Company = mongoose.model('Company');

var blockWords = ['中国','上海','北京','公司'];
module.exports = function (app) {

  return {
    searchCompanies: function(req, res){
      var name = req.body.name;
      if(name&&blockWords.indexOf(name)===-1){
        var regx = new RegExp(name);
        var companies_rst = [];
        //查找未被屏蔽的公司(未激活也返回)
        Company.find({'info.name':regx,'status.active':true}, function (err, companies) {
          if(err) {
            return res.send([]);
          } else {
            if(companies) {
              for(var i = 0; i < companies.length; i ++) {
                companies_rst.push({
                  '_id' : companies[i]._id,
                  'name' : companies[i].info.name,
                  'logo' : companies[i].info.logo,
                  'mail_active' :companies[i].status.mail_active
                });
              }
              return res.status(200).send(companies_rst);
            } else {
              return res.status(200).send([]);
            }
          }
        });
      }else{
        return res.status(400).send({msg:'查询条件有误'});
      }
    }
  }
};