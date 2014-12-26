'use strict';

var mongoose = require('mongoose');
var Report = mongoose.model('Report'),
    donlerValidator = require('../services/donler_validator.js'),
    log = require('../services/error_log.js');
module.exports = function (app) {

  return {
    pushReport: function(req, res){
      donlerValidator({
        hostType: {
          name: '举报主体类型',
          value: req.body.hostType,
          validators: ['required', donlerValidator.enum(['user', 'comment','photo'])]
        },
        hostId: {
          name: '举报主体ID',
          value: req.body.hostId,
          validators: ['required']
        },
        reportType: {
          name: '举报类型',
          value: req.body.reportType,
          validators: ['required', 'number']
        }
      }, 'complete', function (pass, msg) {
        if (!pass) {
          var resMsg = donlerValidator.combineMsg(msg);
          res.status(400).send({ msg: resMsg });
          return;
        }
        var _poster = {
          post_type:req.user.provider
        }
        var _option = {
          host_id: req.body.hostId,
          status:'verifying',
          host_type:req.body.hostType
        }
        if(req.user.provider ==='company'){
          _poster.cid = req.user._id;
          _option['poster.cid'] = req.user._id;
        }
        else{
          _poster.cid = req.user.cid;
          _poster.uid = req.user._id;
          _option['poster.uid'] = req.user._id;
        }
        Report
        .findOne(_option)
        .exec(function(err, report) {
          if(err){
            log(err);
            return res.status(500).send({msg:'举报数据不正确，请重新尝试！'});
          }
          else if(report) {
            return res.status(400).send({msg:'您已经举报过该记录'});
          }
          else{
            var report = new Report();
            report.host_type = req.body.hostType;
            report.host_id = req.body.hostId;
            report.report_type = req.body.reportType;
            report.content = req.body.content;
            report.poster = _poster;
            report.save(function(err){
              if(!err){
                return res.sendStatus(200);
              }
              else{
                log(err);
                return res.status(500).send({msg:'举报数据不正确，请重新尝试！'});
              }
            });
          }
        });
      });
    }
  }
};