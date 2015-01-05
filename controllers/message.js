'use strict';

//站内信
//将JavaScript的回调特性用到了极致...

var mongoose = require('mongoose'),
    async = require('async'),
    Campaign = mongoose.model('Campaign'),
    Message = mongoose.model('Message'),
    MessageContent = mongoose.model('MessageContent'),
    CompanyGroup = mongoose.model('CompanyGroup');

var log = require('../services/error_log.js'),
    auth = require('../services/auth.js');

var time_out = 72*24*3600;
    /**
     * [_sendMessage description]
     * @param  {[type]} param [description]
     *                   type
     *                   specific_type
     *                   caption
     *                   content
     *                   sender
     *                   team
     *                   campaign_id
     *                   auto
     *                   receiver
     * @return {[type]}       [description]
     */
var __sendMessage = function(param,callback) {
      callback = callback || function(err){};
      var MC={
        'type':param.type,
        'caption':param.caption,
        'content':param.content,
        'sender':param.sender,
        'receiver':param.receiver,
        'team':param.team,
        'specific_type':param.specific_type,
        'company_id':param.company_id,
        'campaign_id':param.campaign_id,
        'deadline':(new Date())+time_out,
        'auto':param.auto
      };
      MessageContent.create(MC,function(err,message_content){
        if(err){
          log(err);
          callback(err);
        } else {
          if(MC.type!='global'&&MC.type!=='company') {
            var counter = {'i':0};
            async.whilst(
              function() { return counter.i < param.receiver.length},
              function(__callback){
                var M = {
                  'type':param.type,
                  'rec_id':param.receiver[counter.i]._id,
                  'MessageContent':message_content._id,
                  'specific_type':MC.specific_type,
                  'status':'unread'
                };
                Message.create(M,function(err,message){
                  if(err){
                    log(err);
                  } else {
                    counter.i++;__callback();
                  }
                })
              },
              function(err){
                if(err){
                 log(err);
                 callback(err);
                }
                else{
                  callback(null);
                }
              }
            );
          }
          else {
            callback(null);
          }
        }
      })
    }
module.exports = function (app) {

  return {
    //private
    _sendMessage: __sendMessage,
    sendMessage: function(req, res) {
      var param = {
        'type':req.body.type,
        'caption':req.body.caption,
        'content':req.body.content,
        'specific_type': req.body.specific_type,
        'company_id':req.body.companyId,
        'campaign_id':req.body.campaignId,
        'deadline':(new Date())+time_out,
        'auto': false,
        'sender':[
        {
          _id:req.user._id,
          nickname:req.user.nickname || req.user.info.official_name,
          photo:req.user.photo || req.user.info.logo,
          role:req.user.provider=='company' ? 'HR' :'LEADER'
        }]
      }
      var teamIds = req.body.team;
      var role = auth.getRole(req.user, {
        companies: req.body.companyId ? [req.body.companyId] : [],
        teams: (teamIds &&teamIds.constructor === Array) ? teamIds :[]
      });
      var allow = auth.auth(role, ['publishTeamMessage']);
      var campaignAllow;
      // if(!allow.publishTeamMessage){
      //   return res.status(403).send({msg:'您没有权限发此站内信'});
      // }
      async.parallel([
        function(callback){
          if(teamIds &&teamIds.constructor === Array){
            CompanyGroup
              .find({_id:{'$in':teamIds}})
              .exec()
              .then(function (companyGroups) {
                param.team = [];
                param.receiver =[];
                teamIds.forEach(function(teamId){
                  for(var i =0; i<companyGroups.length; i++){
                    if(companyGroups[i]._id.toString()==teamId){
                      param.team.push({
                        _id : companyGroups[i]._id,
                        name : companyGroups[i].name,
                        logo : companyGroups[i].logo
                      });
                      if(param.type =='team'){
                        companyGroups[i].member.forEach(function(member){
                          param.receiver.push(member._id);
                        });
                      }
                    }
                  }
                });
                callback(null);
              })
              .then(null,function(err){
                callback(err)
              });
          }
          else{
            callback(null)
          }
        },
        function(callback){
          if(req.body.campaignId || param.type =='private'){
            Campaign
              .findOne({_id:req.body.campaignId})
              .exec()
              .then(function (campaign) {
                var role = auth.getRole(req.user, {
                  companies: campaign.cid,
                  teams: campaign.tid
                });
                campaignAllow = auth.auth(role, ['publishTeamMessage']);
                param.receiver =[];
                campaign.members.forEach(function(member){
                  param.receiver.push(member._id);
                });
                callback(null)
              })
              .then(null,function(err){
                callback(err)
              });
          }
          else{
            callback(null)
          }
        }
      ],function(err, values){
        if(err){
          log(err);
          return res.status(500).send({ msg: '服务器错误'});
        }
        else{
          if(!allow.publishTeamMessage &&campaignAllow &&!campaignAllow.publishTeamMessage){
            return res.status(403).send('您没有权限发此站内信');
          }else{
            console.log(param)
            __sendMessage(param,function(err){
              if(err){
                return res.status(500).send({ msg: '服务器错误'});
              }
              else {
                return res.sendStatus(200);
              }
            })
          }
        }
      });
    },
    getMessageList: function(req, res) {
      var requestType = req.query.requestType;
      var requestId = req.query.requestId;
      var userInfo = {};
      if(requestType=='campaign'){
        MessageContent.find({
          'campaign_id': requestId,
          'status': 'undelete',
          'auto': false
        },{'content':1,'sender':1,'post_date':1})
        .sort('-post_date')
        .limit(req.query.limit || 0)
        .exec()
        .then(function (messageContents) {
          res.status(200).send(messageContents);
        })
        .then(null, function (err) {
          log(err);
          return res.status(500).send({msg:err});
        });
      }
      else{
        if(req.user.provider=='user'){
          userInfo.users=[requestId]
        }
        else{
          userInfo.companies=[requestId]
        }
        var condition;
        var role = auth.getRole(req.user, userInfo);
        var allow = auth.auth(role, ['getPrivateMessage']);
        if(!allow.getPrivateMessage){
          return res.status(403).send({msg:'您没有权限获取该站内信列表'});
        }
        switch(requestType){
          case 'private':
            condition = {'type':{'$in':['private','global']},'rec_id':requestId,'status':{'$ne':'delete'}};
          break;
          case 'all':
            condition = {'rec_id':requestId,'status':{'$ne':'delete'}};
          break;
          default:
            condition = {'type':requestType,'rec_id':requestId,'status':{'$ne':'delete'}};
          break;
        }
        Message
          .find(condition)
          .sort('-create_date')
          .populate('MessageContent')
          .limit(req.query.limit || 0)
          .exec()
          .then(function (messages) {
            res.status(200).send(messages);

            // 将未读的站内信标记为已读
            var unreadMessages = messages.filter(function (message) {
              return message.status === 'unread';
            });
            unreadMessages.forEach(function (message) {
              message.status = 'read';
              message.save(function (err) {
                if (err) {
                  console.log(err);
                }
              });
            });

          })
          .then(null, function (err) {
            log(err);
            return res.status(500).send({msg: err});
          });
      }

    },
    receiveMessage: function(req, res) {
      var condition;
      var requestId = req.params.requestId;
      var userInfo = {};
      if(req.user.provider=='user'){
        userInfo.users = [requestId]
      }
      else{
        userInfo.companies = [requestId]
      }
      var role = auth.getRole(req.user, userInfo);
      var allow = auth.auth(role, ['getPrivateMessage']);
      if(!allow.getPrivateMessage){
        return res.status(403).send({msg:'您没有权限获取该站内信列表'});
      }
      switch(req.params.requestType){
        case 'company':
          condition = {'type':'global'};
        break;
        case 'user':
          condition = {'$or':[{'type':'company','company_id':req.user.cid},{'type':'global'}],'post_date':{'$gte':req.user.register_date}};
        break;
        default:
        break;
      }
      MessageContent
      .find(condition,{'_id':1,'type':1,'post_date':1})
      .sort('-post_date')
      .exec()
      .then(function(messageContents){
        var mcs = [];
        for(var i = 0; i < messageContents.length; i ++){
          mcs.push({
            '_id':messageContents[i]._id,
            'type':messageContents[i].type,
            'create_date':messageContents[i].post_date
          });
        }
        Message
        .find({'rec_id':requestId})
        .sort('-post_date')
        .exec()
        .then(function(messages){
          var exist_mc_ids = [];  //该用户已经存在的MessageContent_id
          var new_mcs = [];    //新的站内信id,要创建新的Message
          for(var i = 0; i < messages.length; i ++){
            exist_mc_ids.push(messages[i].MessageContent);
          }
          var find = false;
          for(var j = 0; j < mcs.length; j ++){
            for(var k = 0; k < exist_mc_ids.length; k ++){
              if(mcs[j]._id.toString() === exist_mc_ids[k].toString()){
                find = true;
                break;
              }
            }
            if(!find){
              new_mcs.push(mcs[j]);
            }
          }
          var counter = {'i':0};
          async.whilst(
            function() { return counter.i < new_mcs.length},
            function(__callback){
              var operate = {
                'rec_id':requestId,
                'MessageContent':new_mcs[counter.i]._id,
                'type':new_mcs[counter.i].type,
                'specific_type':new_mcs[counter.i].type == 'company' ? 1 : 0,
                'status':'unread',
                'create_date':new_mcs[counter.i].create_date
              };
              Message.create(operate,function(err,message){
                if(err){
                  log(err);
                } else {
                  counter.i++;
                  __callback();
                }
              });
            },
            function(err){
              if(err){
                log(err);
                return res.status(500).send({'msg':err});
              }else{
                Message.count({'rec_id':requestId,'status':'unread'})
                .exec()
                .then(function(messagesCount){
                  res.status(200).send({
                    count: messagesCount
                  });
                })
                .then(null,function(err){
                  log(err);
                  return res.status(500).send({msg:err});
                });
              }
            }
          );
        })
        .then(null,function(err){
          log(err);
          return res.status(500).send({msg:err});
        });
      })
      .then(null,function(err){
        log(err);
        return res.status(500).send({msg:err});
      });
    },
    getSendMessage: function(req, res) {
      var condition;
      var userInfo = {};
      if(req.user.provider=='user'){
        userInfo.users=[req.params.requestId]
      }
      else{
        userInfo.companies=[req.params.requestId]
      }
      var role = auth.getRole(req.user, userInfo);
      var allow = auth.auth(role, ['getSentMessage']);
      if(!allow.getSentMessage){
        return res.status(403).send({msg:'您没有权限获取该站内信列表'});
      }
      switch(req.params.requestType){
        case 'private':
          condition = {'sender':{'$elemMatch':{'_id':req.params.requestId}},'status':'undelete'};
        break;
        case 'team':
          condition = {'team':{'$elemMatch':{'_id':req.params.requestId}},'status':'undelete'};
        break;
        default:
        break;
      }

      MessageContent
      .find(condition)
      .sort('-post_date')
      .exec()
      .then(function(messageContents){
        res.status(200).send({'count':messageContents.length,'data':messageContents});
      })
      .then(null,function(err){
        log(err);
        return res.status(500).send({msg:err});
      });
    },
    updateMessageList: function(req, res) {
      var status = req.body.status;
      var _type = req.query.requestType;
      var requestId = req.query.requestId;
      var status_model = ['read','unread','delete','undelete'];
      var operateModel = Message;
      var condition;
      var userInfo = {};
      if(req.user.provider=='user'){
        userInfo.users=[requestId]
      }
      else{
        userInfo.companies=[requestId]
      }
      var role = auth.getRole(req.user, userInfo);
      var allow = auth.auth(role, ['updatePrivateMessage']);
      if(!allow.updatePrivateMessage){
        return res.status(403).send({msg:'您没有权限更新该站内信'});
      }
      if(status_model.indexOf(status) <0){
        return res.status(400).send({msg:'数据错误'})
      }
      if(_type === 'send'){
        operateModel = MessageContent;
      }
      if(!req.body.multi){
        var msg_id = req.body.msg_id;
        condition = {'rec_id':msg_id};
      }else{
        switch(_type){
          case 'all':
            condition = {'rec_id':req.user._id,'status':{'$ne':'delete'}};
          break;
          case 'private':
            condition = {'type':{'$in':['private','global']},'rec_id':req.user._id,'status':{'$ne':'delete'}};
          break;
          case 'send':
            condition = {'sender':{'$elemMatch':{'_id':req.user._id}},'status':{'$ne':'delete'}};
          break;
          default:
            condition = {'type':_type,'rec_id':req.user._id,'status':{'$ne':'delete'}};
          break;
        }
      }
      operateModel.update(condition,{'$set':{'status':status}},{multi: req.body.multi},function(err,message){
        if(err){
          log(err)
        }else{
          res.sendStatus(200);
        }
      });
    }
      
  }
}

