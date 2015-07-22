'use strict';

var mongoose = require('mongoose');
var Report = mongoose.model('Report'),
    donlerValidator = require('../../services/donler_validator.js'),
    log = require('../../services/error_log.js'),
    auth = require('../../services/auth.js');
module.exports = {
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
            var reportModel;
            switch(req.body.hostType) {
              case 'user':
                reportModel = 'User';
                break;
              case 'comment':
                reportModel = 'Comment';
                break;
              case 'photo':
                reportModel = 'Photo';
                break;
            }
            mongoose.model(reportModel)
            .findById(req.body.hostId)
            .exec()
            .then(function(_reportModel){
              var content_poster = {};
              switch(req.body.hostType) {
                case 'user':
                  content_poster.uid = _reportModel._id;
                  content_poster.cid = _reportModel.cid;
                  break;
                case 'comment':
                  content_poster.uid = _reportModel.poster._id;
                  content_poster.cid = _reportModel.poster.cid;
                  break;
                case 'photo':
                  content_poster.cid = _reportModel.owner.companies[0];
                  if(_reportModel.upload_user=='user') {
                    content_poster.uid = _reportModel.upload_user._id;
                  }
                  break;
              }
              report.content_poster =content_poster;
              report.save(function(err){
                if(!err){
                  return res.sendStatus(200);
                }
                else{
                  log(err);
                  return res.status(500).send({msg:'举报数据不正确，请重新尝试！'});
                }
              });
            })
            .then(null, function (err) {
              log(err);
              return res.status(500).send({msg: err });
            });
          }
        });
      });
    },
    //hr处理举报
    dealReport: function (req, res) {
      var _status;
      if(req.body.flag == true){
        _status = 'active';
      }
      else{
        _status = 'inactive';
      }
      var hostModel;
      if(req.body.host_type==='comment'){
        hostModel ='Comment';
      }
      else if(req.body.host_type==='user'){
        hostModel ='User';
      }
      else{
        return res.status(400).send({msg: '数据格式错误' });
      }
      Report.update({'hr_status':'verifying','host_type': req.body.host_type,'host_id':req.body.host_id,'content_poster.cid': req.user._id,},{$set:{'hr_status':_status}},{multi: true},function(err,num){
        if(err){
          log(err);
        }
      });
      if(_status==='active'){
        mongoose.model(hostModel).findOne({
          _id: req.body.host_id
        }).exec()
        .then(function (reportModel) {
          if (reportModel) {
            if(req.body.host_type==='comment'){
              if(reportModel.poster.cid.toString()==req.user._id.toString()) {
                reportModel.status = 'shield';
              }
            }
            else if(req.body.host_type==='user'){
              if(reportModel.cid.toString()==req.user._id.toString()) {
                reportModel.disabled = true;
              }
            }
            reportModel.save(function (err) {
                if (err) {
                  log(err);
                  return res.status(500).send({msg: err });
                } else {

                  return res.sendStatus(200);
                }
              });
          }
          else{
            log(err);
            return res.status(500).send({msg: err });
          }
        })
        .then(null, function (err) {
          log(err);
          return res.status(500).send({msg: err });
        });
      }
      else{
        return res.sendStatus(200);
      }
    }
};