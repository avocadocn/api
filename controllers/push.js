'use strict';

var mongoose = require('mongoose');
var User = mongoose.model('User');
var Config = mongoose.model('Config');
var Campaign = mongoose.model('Campaign');
var CompanyGroup = mongoose.model('CompanyGroup');
var log = require('../services/error_log.js');
var auth = require('../services/auth.js');
var encrypt = require('../services/encrypt');
var _config = require('../config/config');
var http = require('http');
var util = require('util');
var host = "127.0.0.1";
var debug = false;
var  urlencode = function (str) {
  // http://kevin.vanzonneveld.net
  str = (str + '').toString();
  // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
  // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
  replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}
var pushCampaign = function(data,cb){
  var bodyArgsArray = [];
  for (var i in data) {
    if (data.hasOwnProperty(i)) {
      if(typeof data[i] == 'object'){
        bodyArgsArray.push(i + '=' + urlencode(JSON.stringify(data[i])));
      }else{
        bodyArgsArray.push(i + '=' + urlencode(data[i]));
      }
    }
  }
  var bodyStr = bodyArgsArray.join('&');

  if (debug) {
      console.log('body length = ' + bodyStr.length + ', body str = ' + bodyStr);
  }
  var options = {
      host: host,
      port: 4000,
      method: 'POST',
      path: "/push/campaign",
      headers: {'Content-Length': bodyStr.length,
                'Content-Type':'application/x-www-form-urlencoded'
               }
  };
  var req = http.request(options, function (res) {
      if (debug) {
          console.log('status = ' + res.statusCode);
          console.log('res header = ');
          console.dir(res.headers);
      }

      var resBody = '';
      res.on('data', function (chunk) {
          resBody += chunk;
      });

      res.on('end', function () {
          if (debug) {
              console.log('res body: ' + resBody);
          }
          //var jsonObj = JSON.parse(resBody);
          try {
            var jsonObj = JSON.parse(resBody);
          } catch(e) {
            cb && cb(e,null);
            return;
          }
          var errObj = null;
          var id ={request_id: null};
          id.request_id = jsonObj['request_id'];
          if (res.statusCode != 200) {
              var error_code = 'Unknown';
              if (jsonObj['error_code'] !== undefined) {
                  error_code = jsonObj['error_code'];
              }

              var error_msg = 'Unknown';
              if (jsonObj['error_msg'] !== undefined) {
                  error_msg = jsonObj['error_msg'];
              }

              var request_id = 'Unknown';
              if (jsonObj['error_msg'] !== undefined) {
                  request_id = jsonObj['request_id'];
              }

              errObj = new Error('Push error code: ' + error_code +
                                  ', error msg: ' + error_msg +
                                  ', request id: ' + request_id);
          }

          cb(errObj, jsonObj);
      });
  });
  req.on('error', function (e) {
      if (debug) {
          console.log('error : ' + util.inspect(e));
      }
      cb(e, null);
  });

  req.write(bodyStr);
  req.end();
}

module.exports = function (app) {
  return {
    getPushStatus: function(req, res){
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }

          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['getUserCompleteData']);
          if (allow.getUserCompleteData) {
            res.status(200).send(user.push_toggle);
          }
          else{
            res.status(403).send({ msg: "没有权限获取该信息" });
          }

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    updatePushStatus: function(req, res){
      User.findById(req.params.userId).exec()
        .then(function (user) {
          if (!user) {
            return res.status(404).send({ msg: "找不到该用户" });
          }

          var role = auth.getRole(req.user, {
            companies: [user.cid],
            users: [user._id]
          });
          var allow = auth.auth(role, ['changeUserPushStatus']);
          if (allow.changeUserPushStatus) {
            user.push_toggle = !!req.body.pushStatus;
            user.save(function(err){
              res.status(200).send(user.push_toggle);
            });
          }
          else{
            res.status(403).send({ msg: "没有权限获取该信息" });
          }

        })
        .then(null, function (err) {
          log(err);
          res.sendStatus(500);
        });
    },
    campaign : function(campaign_id){
      var cb = function(a,b){
        console.log(a,b);
      }
      Config.findOne({'name':'admin'},function (err,config){
        if(config.push.status){
          if(config.push.status == 'on'){

            Campaign.findOne({'_id':campaign_id},{'tid':1,'_id':1,'theme':1,'cid':1},function (err,campaign){
              if(err || !campaign){
                //TODO
                //错误日志
              }else{
                if(campaign.tid.length===0){//公司
                  User.find({'cid':campaign.cid[0]},{'_id':1},function (err ,users){
                    if(err || !users){
                      //TODO
                      //错误日志
                    }else{
                      var data = {
                        key:{
                          campaign_id:campaign._id.toString(),
                          campaign_id_key:encrypt.encrypt(campaign._id.toString(),_config.SECRET)
                        },
                        body: '您有新活动: ' + campaign.theme,
                        description: '您有新活动: ' + campaign.theme,
                        title: '您的公司有新活动',
                        members: users
                      }
                      pushCampaign(data,cb);
                    }
                  })
                }
                else if(campaign.tid){
                  CompanyGroup.find({'_id':{'$in':campaign.tid}},{'member':1,'_id':1},function (err,teams){
                    if(err || !teams){
                      //TODO
                      //错误日志
                    }else{
                      var members = [];
                      for(var i = 0; i < teams.length; i ++){
                        for(var j = 0; j < teams[i].member.length; j ++){
                          members.push(teams[i].member[j]);
                        }
                      }
                      if(members.length > 0){
                        var data = {
                          key:{
                            campaign_id:campaign._id.toString(),
                            campaign_id_key:encrypt.encrypt(campaign._id.toString(),_config.SECRET)
                          },
                          body: '您有新活动: ' + campaign.theme,
                          description: '您有新活动: ' + campaign.theme,
                          title: '您的小队有新活动',
                          members: members
                        }
                        pushCampaign(data,cb);
                      }
                    }
                  })
                }else{
                  //TODO
                  //错误日志
                }
              }
            })
          }
        }
      });
    }
  }
}