'use strict';

//站内信
//将JavaScript的回调特性用到了极致...

var mongoose = require('mongoose'),
    async = require('async'),
    Campaign = mongoose.model('Campaign'),
    Message = mongoose.model('Message'),
    MessageContent = mongoose.model('MessageContent'),
    CompanyGroup = mongoose.model('CompanyGroup');
    // auth = require('../services/auth');


var time_out = 72*24*3600;

/**
  * 数据库查询
  * @param {String}   param.collection    待查询集合
  * @param {Number}   param.type          查询方式(0:单文档  1:多文档)
  * @param {Object}   param.condition     查询条件
  * @param {Object}   param.limit         查询限制
  * @param {Object}   param.sort          查询排序方式
  * @param {String}   param.populate      如不为空则按照populate方式进行查询,populate即为待populate的集合名称
  * @param {Function} param.callback      查询完返回正确结果后的处理函数
  * @param {Function} param._err          查询出现错误的处理函数
  * @param {Object}   param.other_param   可能需要的额外参数
  * @param {Object}   param.req           请求变量
  * @param {Object}   param.res           结果变量
 */
function get(param){
  switch(param.type){
    case 0:
      if(param.populate == undefined || param.populate == null){
        param.collection.findOne(param.condition,param.limit,function(err,message){
          if(err || !message){
            if(param._err!=null && typeof param._err == 'function'){
              param._err(err,param.req,param.res);
            }
          }else{
            if(param.callback!=null && typeof param.callback == 'function'){
              param.callback(message,param.other_param,param.req,param.res);
            }
          }
        });
      }else{
        param.collection.findOne(param.condition,param.limit).populate(param.populate).exec(function(err,message){
          if(err || !message){
            if(param._err!=null && typeof param._err == 'function'){
              param._err(err,param.req,param.res);
            }
          }else{
            if(param.callback!=null && typeof param.callback == 'function'){
              param.callback(message,param.other_param,param.req,param.res);
            }
          }
        });
      }
      break;
    case 1:
      if(param.populate == undefined || param.populate == null){
        param.collection.find(param.condition,param.limit).sort(param.sort).exec(function(err,messages){
          if(err || !messages){
            if(param._err!=null && typeof param._err == 'function'){
              param._err(err,param.req,param.res);
            }
          }else{
            if(param.callback!=null && typeof param.callback == 'function'){
              param.callback(messages,param.other_param,param.req,param.res);
            }
          }
        });
      }else{
        param.collection.find(param.condition,param.limit).sort(param.sort).populate(param.populate).exec(function(err,messages){
          if(err || !messages){
            if(param._err!=null && typeof param._err == 'function'){
              param._err(err,param.req,param.res);
            }
          }else{
            if(param.callback!=null && typeof param.callback == 'function'){
              param.callback(messages,param.other_param,param.req,param.res);
            }
          }
        });
      }
      break;
    default:break;
  }
}


/**
  * 数据库更新
  * @param {String}   param.collection    待更新集合
  * @param {Number}   param.type          更新的方式(0:根据id单文档更新  1:根据具体条件多文档更新)
  * @param {Object}   param.condition     更新条件
  * @param {Object}   param.operate       更新的具体操作条件
  * @param {Function} param.callback      更新完返回正确结果后的处理函数
  * @param {Function} param._err          更新出现错误的处理函数
  * @param {Object}   param.other_param   可能需要的额外参数
  * @param {Object}   param.req           请求变量
  * @param {Object}   param.res           结果变量
 */
function set(param){
  switch(param.type){
    case 0:
      param.collection.update({'_id':param.condition},param.operate,function(err,message){
        if(err || !message){
          if(param._err!=null && typeof param._err == 'function'){
            param._err(err,param.req,param.res);
          }
        }else{
          if(param.callback!=null && typeof param.callback == 'function'){
            param.callback(message,param.other_param,param.req,param.res);
          }
        }
      });
    case 1:
      param.collection.update(param.condition,param.operate,{multi: true},function(err,message){
        if(err || !message){
          if(param._err!=null && typeof param._err == 'function'){
            param._err(err,param.req,param.res);
          }
        }else{
          if(param.callback!=null && typeof param.callback == 'function'){
            param.callback(message,param.other_param,param.req,param.res);
          }
        }
      });
    default:break;
  }
}


/**
  * 数据库插入
  * @param {String}   param.collection    待插入集合
  * @param {Object}   param.operate       插入的具体操作条件
  * @param {Function} param.callback      更新完返回正确结果后的处理函数
  * @param {Function} param._err          更新出现错误的处理函数
  * @param {Object}   param.other_param   可能需要的额外参数
  * @param {Object}   param.req           请求变量
  * @param {Object}   param.res           结果变量
 */
function _add(param){
  param.collection.create(param.operate,function(err,message){
    if(err || !message){
      if(param._err!=null && typeof param._err == 'function'){
        param._err(err,param.req,param.res);
      }
    } else {
      if(param.callback!=null && typeof param.callback == 'function'){
        param.callback(message,param.other_param,param.req,param.res);
      }
    }
  })
}


/**
  * 数据库删除
  * @param {String}   param.collection    待删除集合
  * @param {Object}   param.condition     删除的查询条件
  * @param {Function} param.callback      删除完返回正确结果后的处理函数
  * @param {Function} param._err          删除出现错误的处理函数
  * @param {Object}   param.other_param   可能需要的额外参数
  * @param {Object}   param.req           请求变量
  * @param {Object}   param.res           结果变量
 */
function drop(param){
  param.collection.remove(param.condition,function(err,message){
    if(err || !message){
      if(param._err!=null && typeof param._err == 'function'){
        param._err(err,param.req,param.res);
      }
    }else{
      if(param.callback!=null && typeof param.callback == 'function'){
        param.callback(message);
      }
    }
  });
}

var _err = function(err,req,res){
  console.log(err);
}





//无论是组长对组员、hr对员工还是生成新活动后对该活动所属组所有组员发送站内信,都可以调用此函数
var oneToMember = function(param){
  var callback = function (message_content,other,req,res){
    var counter = {'i':0};
    async.whilst(
      function() { return counter.i < other[0].length},
      function(__callback){
        var M = {
          'type':other[1],
          'rec_id':other[0][counter.i]._id,
          'MessageContent':message_content._id,
          'specific_type':other[2],
          'status':'unread'
        };
        var param = {
          'collection':Message,
          'operate':M,
          'callback':function(message,_counter,req,res){_counter.i++;__callback();},
          '_err':_err,
          'other_param':counter,
          'req':req,
          'res':res
        };
        _add(param);
      },
      function(err){
        if(err){
          return res.send({'result':0,'msg':'FAILURED'});
        }else{
          return res.send({'result':1,'msg':'SUCCESS'});
        }
      }
    );
  }
  var MC={
    'type':'private',
    'caption':param.caption,
    'content':param.content,
    'sender':param.sender,
    'team':param.team,
    'specific_type':param.campaign_id == null ? {'value':2} : ({'value':2,'child_type':param.team[0].status}),
    'company_id':param.company_id,
    'campaign_id':param.campaign_id,
    'deadline':(new Date())+time_out
  };
  var _param = {
    'collection':MessageContent,
    'operate':MC,
    'callback':callback,
    '_err':_err,
    'other_param':[param.members,param.type,MC.specific_type],
    'req':param.req,
    'res':param.res
  };
  _add(_param);
}

//HR给 所有公司成员/某一小队 发送站内信
exports.hrSendToMember = function(req,res){
  //给全公司员工发站内信
  var team = req.body.team;
  var content = req.body.content;
  var cid = req.body.cid;
  var sender = {
    '_id':req.user._id,
    'nickname':req.user.info.official_name,
    'photo':req.user.info.logo,
    'role':'HR'
  };
  var MC={
    'caption':'Message From Company',
    'content':content,
    'sender':[sender],
    'team':[],
    'specific_type':{
      'value':1
    },
    'type':'company',
    'company_id':cid,
    'deadline':(new Date())+time_out
  };
  if(team.own._id == 'null'){
    var callback = function (message_content,cid,req,res){
      res.send({'result':1,'msg':'SUCCESS'});
    }
    var _param = {
      'collection':MessageContent,
      'operate':MC,
      'callback':callback,
      '_err':_err,
      'other_param':cid,
      'req':req,
      'res':res
    };
    _add(_param);
  //给某一小队发送站内信
  }else{
    sender = {
      '_id':req.user._id,
      'nickname':req.user.info.name,
      'photo':req.user.info.logo,
      'role':'HR'
    };
    MC.specific_type={
      'value':2
    };
    var caption = 'Message From Company';
    sendToTeamMember(team,content,caption,sender,req,res);
  }
}



//组长给组员发送站内信的具体实现
var sendToTeamMember =function(team,content,caption,sender,req,res){
  var callback = function(company_group,team,req,res){
    if(company_group){
      var members = company_group[0].member;
      var _param = {
        'members':members,
        'caption':caption,
        'content':content,
        'sender':[sender],
        'team':[team.own],
        'company_id':null,
        'campaign_id':null,
        'req':req,
        'res':res,
        'type':'team'
      }
      oneToMember(_param);
    }
  }
  var param= {
    'collection':CompanyGroup,
    'type':1,
    'condition':{'_id':team.own._id},
    'limit':{'member':1},
    'sort':null,
    'callback':callback,
    '_err':_err,
    'other_param':team,
    'req':req,
    'res':res
  };
  get(param);
}

//组长给组员发送站内信
exports.leaderSendToMember = function(req,res){
  var team = req.body.team;
  var content = req.body.content,
      sender = {
        '_id':req.user._id,
        'nickname':req.user.nickname,
        'photo':req.user.photo,
        'role':'LEADER'
      },
      caption = 'Message From Leader';
  sendToTeamMember(team,content,caption,sender,req,res);
};


//一对一发送站内信的具体实现
var toOne = function(req,res,param){
  var callback = function (message_content,other,req,res){
    var M = {
      'type':'private',
      'rec_id':other[0]._id,
      'specific_type':other[1],
      'MessageContent':message_content._id,
      'status':'unread'
    };
    var param = {
      'collection':Message,
      'operate':M,
      'callback':function(message,other,req,res){return {'result':1,'msg':'SUCCESS'};},
      '_err':_err,
      'other_param':null,
      'req':req,
      'res':res
    };
    _add(param);
  }
  var MC={
    'type':param.type,
    'specific_type':param.specific_type,
    'caption':param.caption,
    'content':param.content,
    'sender':[param.own],
    'team':param.team,
    'company_id':null,
    'campaign_id':param.campaign_id,
    'department_id':null,
    'deadline':(new Date())+time_out,
    'auto':((param.auto != undefined && param.auto != null) ? param.auto : false)
  };
  var _param = {
    'collection':MessageContent,
    'operate':MC,
    'callback':callback,
    '_err':_err,
    'other_param':[param.receiver,param.specific_type],
    'req':req,
    'res':res
  };
  _add(_param);
}


//一对一发送站内信
exports.sendToOne = function(req, res, param){
  param.team = [param.own_team,param.receive_team];
  toOne(req,res,param);
}


//给参加某活动/比赛的成员发送站内信
exports.sendToParticipator = function(req, res){
  var callback = function(campaign,join_team,req,res){
    var sender = {
      '_id':req.user._id,
      'nickname':req.user.provider == 'user' ? req.user.nickname : req.user.info.official_name,
      'photo':req.user.provider == 'user' ? req.user.photo : req.user.info.logo,
      'role':req.user.provider == 'user' ? 'LEADER' : 'HR'
    };

    if(campaign){
      var teams = [];
      var members = [];

      if (campaign.campaign_type !== 1) {
        campaign.campaign_unit.forEach(function (unit) {
          teams.push({
            _id: unit.team._id,
            name: unit.team.name,
            logo: unit.team.logo,
            status: 0
          });
        });
      }

      campaign.members.forEach(function (member) {
        members.push({
          _id: member._id,
          nickname: member.nickname
        })
      });

      var _param = {
        'members':members,
        'caption':campaign.theme,
        'content':req.body.content,
        'sender':[sender],
        'team': teams,
        'company_id':req.user.getCid(),
        'campaign_id':req.body.campaign_id,
        'req':req,
        'res':res,
        'type':'team'
      }
      oneToMember(_param);
    }
  }
  var param= {
    'collection':Campaign,
    'type':0,
    'condition':{'_id':req.body.campaign_id},
    'sort':null,
    'callback':callback,
    'req':req,
    'res':res
  };
  get(param);
}


//比赛结果确认时给队长发送站内信
exports.resultConfirm = function(req,res,olid,team,competition_id,theme){
  var content = null,
      sender = {
        '_id':req.user._id,
        'nickname':req.user.nickname,
        'photo':req.user.photo,
        'role':'LEADER'
      };
  var callbackMC = function (message_content,other,req,res){
    var callbackM = function (message_content,other,req,res){
      return {'result':1,'msg':'SUCCESS'};
    }
    var M={
      'rec_id':other[0],
      'specific_type':other[1],
      'MessageContent':message_content._id,
      'type':'private',
      'status':'unread'
    };
    var _param = {
      'collection':Message,
      'operate':M,
      'callback':callbackM,
      '_err':_err,
      'other_param':null,
      'req':req,
      'res':res
    };
    _add(_param);
  }
  var MC={
    'caption':theme,
    'content':content,
    'sender':[sender],
    'team':[team],
    'specific_type':{
      'value':5,
      'child_type':(team.status - 2)
    },
    'type':'private',
    'company_id':req.user.cid,
    'campaign_id':competition_id,
    'auto':true,
    'deadline':(new Date())+time_out
  };
  var _param = {
    'collection':MessageContent,
    'operate':MC,
    'callback':callbackMC,
    '_err':_err,
    'other_param':[olid,MC.specific_type],
    'req':req,
    'res':res
  };
  _add(_param);
}


//按照条件获取未读站内信
var getPublicMessage = function(req,res,cid){
  var callbackA = function(message_contents,other,req,res){
    if(message_contents.length > 0){
      var mcs = [];
      for(var i = 0; i < message_contents.length; i ++){
        mcs.push({
          '_id':message_contents[i]._id,
          'type':message_contents[i].type,
          'create_date':message_contents[i].post_date
        });
      }
      var callbackB = function(messages,mcs,req,res){
        //该用户有站内信
        if(messages.length > 0){
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
          if(new_mcs.length > 0){
            var counter = {'i':0};
            async.whilst(
              function() { return counter.i < new_mcs.length},
              function(__callback){
                var M = {
                  'rec_id':req.user._id,
                  'MessageContent':new_mcs[counter.i]._id,
                  'type':new_mcs[counter.i].type,
                  'specific_type':new_mcs[counter.i].type == 'company' ? 1 : 0,
                  'status':'unread',
                  'create_date':new_mcs[counter.i].create_date
                };
                var param = {
                  'collection':Message,
                  'operate':M,
                  'callback':function(message,_counter,req,res){_counter.i++;__callback();},
                  '_err':_err,
                  'other_param':counter,
                  'req':req,
                  'res':res
                };
                _add(param);
              },
              function(err){
                if(err){
                  return res.send({'result':1,'msg':'FAILURED'});
                }else{
                  console.log('USER_ALREADY_HAS_MSG_AND_NEW');
                  getMessageForHeader(req,res,{'rec_id':req.user._id,'status':{'$nin':['delete','read']}},{'rec_id':1,'status':1},null);
                }
              }
            );
          }else{
            console.log('USER_ALREADY_HAS_MSG_AND_OLD');
            getMessageForHeader(req,res,{'rec_id':req.user._id,'status':{'$nin':['delete','read']}},{'rec_id':1,'status':1},null);
          }
        //该用户没有收到任何站内信
        }else{
          var counter = {'i':0};
          async.whilst(
            function() { return counter.i < message_contents.length},
            function(__callback){
              if(message_contents[counter.i].post_date > req.user.register_date){
                var M = {
                  'rec_id':req.user._id,
                  'MessageContent':message_contents[counter.i]._id,
                  'type':message_contents[counter.i].type,
                  'specific_type':message_contents[counter.i].type == 'company' ? 1 : 0,
                  'status':'unread',
                  'create_date':message_contents[counter.i].post_date
                };
                var param = {
                  'collection':Message,
                  'operate':M,
                  'callback':function(message,_counter,req,res){_counter.i++;__callback();},
                  '_err':_err,
                  'other_param':counter,
                  'req':req,
                  'res':res
                };
                _add(param);
              }else{
                counter.i++;
                __callback();
              }
            },
            function(err){
              if(err){
                return res.send({'result':1,'msg':'FAILURED'});
              }else{
                console.log('USER_HAS_NO_MSG_AND_NEW');
                getMessageForHeader(req,res,{'rec_id':req.user._id,'status':{'$nin':['delete','read']}},{'rec_id':1,'status':1},null);
              }
            }
          );
        }
      }

      var paramB = {
        'collection':Message,
        'type':1,
        'condition':{'rec_id':req.user._id},
        'limit':null,
        'sort':{'post_date':-1},
        'callback':callbackB,
        '_err':_err,
        'other_param':mcs,
        'req':req,
        'res':res
      };
      get(paramB);
    }else{ //没有任何公共消息
      console.log('NO_NEW_PUBLIC_MSG');
      getMessageForHeader(req,res,{'rec_id':req.user._id,'status':{'$nin':['delete','read']}},{'rec_id':1,'status':1},null);
    }
  }
  var _condition;
  if(req.user.provider==='company'){
    _condition = {'type':'global'};//公司只获取系统消息
  }else{
    _condition = {'$or':[{'type':'company','company_id':cid},{'type':'global'}],'post_date':{'$gte':req.user.register_date}};//用户获取公司和系统消息
  }
  var paramA = {
    'collection':MessageContent,
    'type':1,
    'condition':_condition,
    'limit':{'_id':1,'type':1,'post_date':1},
    'sort':{'post_date':-1},
    'callback':callbackA,
    '_err':_err,
    'other_param':null,
    'req':req,
    'res':res
  };
  get(paramA);
}

//获取最新未读站内信
var getMessageForHeader = function(req,res,condition,limit,handle){
  var callback = function(messages,other,req,res){
    var rst = [];
    for(var i = 0; i < messages.length; i ++){
      rst.push({
        '_id':messages[i]._id,
        'rec_id':messages[i].rec_id,
        'status':messages[i].status
      });
    }
    res.send({
      'msg':rst,
      'team':req.user.team,
      'cid':req.user.provider === 'company' ? req.user._id : req.user.cid,
      'uid':req.user._id,
      'provider':req.user.provider
    });
  }
  var _err = function(err,req,res){
    res.send({
      'msg':[],
      'team':req.user.team,
      'cid':req.user.provider === 'company' ? req.user._id : req.user.cid,
      'uid':req.user._id,
      'provider':req.user.provider
    });
  }
  var param = {
    'collection':Message,
    'type':1,
    'condition':condition,
    'limit':limit,
    'sort':{'create_date':-1},
    'populate':null,
    'callback':callback,
    '_err':_err,
    'other_param':null,
    'req':req,
    'res':res
  };
  get(param);
}



//按照条件获取所有站内信

//specific_type
//0 系统消息
//1 公司消息
//2 小队消息(结合sender来判断是公司发的还是队长发的)
//3 活动或者比赛消息(child_type=0为活动  child_type=1为比赛   结合sender来判断是公司发的还是队长发的)
//4 和挑战相关的消息(child_type=0为发起挑战  child_type=1为接受挑战   child_type=2为拒绝挑战  child_type=3为取消挑战)
//5 和比赛确认相关的消息(child_type=0对方发起新的比赛确认(或者对之前的比分发出异议)  child_type=1对方接受比分确认)
var getMessage = function(req,res,condition,limit,handle){
  var callback = function(messages,other,req,res){
    var rst = [];
    if(other[0] != null){
      for(var i = 0; i < messages.length; i ++){
        if(callback(messages[i][other[1]])){
          rst.push({
            '_id':messages[i]._id,
            'rec_id':messages[i].rec_id,
            'status':messages[i].status,
            'type':messages[i].type,
            'specific_type':messages[i].specific_type,
            'message_content':messages[i][other[1]]
          });
        }
      }
    }else{
      for(var i = 0; i < messages.length; i ++){
        rst.push({
          '_id':messages[i]._id,
          'rec_id':messages[i].rec_id,
          'status':messages[i].status,
          'type':messages[i].type,
          'specific_type':messages[i].specific_type,
          'message_content':messages[i][other[1]]
        });
      }
    }
    res.send({
      'msg':rst,
      'team':req.user.team,
      'cid':req.user.provider === 'company' ? req.user._id : req.user.cid,
      'uid':req.user._id,
      'provider':req.user.provider
    });
  }
  var _err = function(err,req,res){
    res.send({
      'msg':[],
      'team':req.user.team,
      'cid':req.user.provider === 'company' ? req.user._id : req.user.cid,
      'uid':req.user._id,
      'provider':req.user.provider
    });
  }
  var param = {
    'collection':Message,
    'type':1,
    'condition':condition,
    'limit':limit,
    'sort':{'create_date':-1},
    'populate':'MessageContent',
    'callback':callback,
    '_err':_err,
    'other_param':[handle,'MessageContent'],
    'req':req,
    'res':res
  };
  get(param);
}

//修改站内信状态(比如用户点击了一条站内信就把它设为已读,或者删掉这条站内信)
exports.setMessageStatus = function(req,res){
  var status = req.body.status;
  var _type = req.body.type;
  var status_model = ['read','unread','delete','undelete'];
  if(status_model.indexOf(status) > -1){
    var operate = {'$set':{'status':status}};
    var callback = function(value){
      res.send({'msg':'MODIFY_OK'});
    }
    var param = {
      'collection':Message,
      'operate':operate,
      'callback':callback,
      '_err':_err
    };
    if(_type === 'send'){
      param.collection = MessageContent;
    }
    if(!req.body.multi){
      var msg_id = req.body.msg_id;
      param.condition = msg_id;
      param.type = 0;
    }else{
      switch(_type){
        case 'all':
          param.condition = {'rec_id':req.user._id,'status':{'$ne':'delete'}};
        break;
        case 'private':
          param.condition = {'$or':[{'type':'private'},{'type':'global'}],'rec_id':req.user._id,'status':{'$ne':'delete'}};
        break;
        case 'send':
          param.condition = {'sender':{'$elemMatch':{'_id':req.user._id}},'status':{'$ne':'delete'}};
        break;
        default:
          param.condition = {'type':_type,'rec_id':req.user._id,'status':{'$ne':'delete'}};
        break;
      }
      param.type = 1;
    }
    set(param);
  }else{
    res.send({'msg':'STATUS_ERROR'});
  }
}


//列出已发送消息
exports.senderList = function(req,res){
  var _condition;
  switch(req.params.sendType){
    case 'private':
      var sid = req.user._id;
      _condition = {'sender':{'$elemMatch':{'_id':sid}},'status':'undelete'};
    break;
    case 'team':
      var teamId = req.params.sendId;
      _condition = {'team':{'$elemMatch':{'_id':teamId}},'status':'undelete'};
    break;
    default:break;
  }

  var callback = function(message_contents,other,req,res){
    res.send({'msg':'SUCCESS','message_contents':message_contents});
  }
  var paramA = {
    'collection':MessageContent,
    'type':1,
    'condition':_condition,
    'limit':null,
    'sort':{'post_date':-1},
    'callback':callback,
    '_err':_err,
    'other_param':null,
    'req':req,
    'res':res
  };
  get(paramA);
}

//手动获取私信
exports.messageGetByHand = function(req,res){
  var _type = req.body._type;
  var condition;
  switch(_type){
    case 'private':
      condition = {'$or':[{'type':'private'},{'type':'global'}],'rec_id':req.user._id,'status':{'$ne':'delete'}};
    break;
    case 'all':
      condition = {'rec_id':req.user._id,'status':{'$ne':'delete'}};
    break;
    default:
      condition = {'type':_type,'rec_id':req.user._id,'status':{'$ne':'delete'}};
    break;
  }
  getMessage(req,res,condition,null,null);
}


//只读取未读站内信
exports.messageHeader = function(req,res){
  if(req.user){
    if(req.user.provider){
      //用户可以读取各种类型的站内信
      if(req.user.provider === 'user'){
        getPublicMessage(req,res,req.user.cid);
      //公司只能读取系统站内信
      }else{
        getPublicMessage(req,res,null);
      }
    }else{
      res.send({'msg':[]});
    }
  }else{
    res.send({'msg':[]});
  }
}


exports.home = function(req,res){
  if(req.role !=='GUESTHR' && req.role !=='GUEST' && req.role !=='GUESTLEADER'){

    var _send = {
      'role':req.role,
      'cid':req.user.provider === 'user'? req.user.cid : req.user._id,
      'team':req.params.teamId ? true : false,
      'teamId': req.companyGroup != undefined ? req.companyGroup._id : null,
      'teamName': req.companyGroup != undefined ? req.companyGroup.name : null,
      'teamLogo': req.companyGroup != undefined ? req.companyGroup.logo : null
    };
    _send.leader = false;
    if(req.params.teamId){
      _send.logo = _send.teamLogo;
      _send.name = _send.teamName;
      _send.teamId = req.params.teamId;
      if(req.user.provider==='user'){
        for(var i = 0 ; i < req.user.team.length; i ++){
          if(req.user.team[i]._id.toString() === _send.teamId.toString()){
            _send.leader = req.user.team[i].leader;
            break;
          }
        }
      }
    }
    else if(req.user.provider==='user'){
      _send.logo = req.user.photo;
      _send.name = req.user.nickname;
      _send.cid = req.user.cid;
    }
    else{
      _send.logo = req.user.info.logo;
      _send.name = req.user.info.official_name;
      _send.cid = req.user._id;
    }
    res.render('message/message',_send);
  }else{
    res.status(403);
    next('forbidden');
    return;
  }
}
exports.renderAll = function(req,res){
  if(req.role !=='GUESTHR' && req.role !=='GUEST' && req.role !=='GUESTLEADER'){
    res.render('message/all',{'provider':req.user.provider});
  }else{
    res.status(403);
    next('forbidden');
    return;
  }
}
exports.renderSender = function(req,res,next){
  res.render('message/send',{'provider':req.user.provider});
}

// exports.recommandTeamToLeader = function(req,res){
//   var allow = auth(req.user, {companies:[req.companyGroup.cid],teams:[req.params.teamId]},['recommandTeamToLeader']);
//   if(allow.recommandTeamToLeader){
//     var MC = new MessageContent({
//       'caption':"Private Message",
//       'sender':[{'_id':req.user._id,'nickname':req.user.nickname,'photo':req.user.photo,'role':'USER'}],
//       'team':[{'_id':req.body.opponent._id,'name':req.body.opponent.name}],
//       'specific_type':{'value':6}
//     });
//     var newMessage = new Message({
//       'rec_id':req.companyGroup.leader[0]._id,
//       'MessageContent':MC._id,
//       'type':'private',
//       'status':'unread',
//       'specific_type':{'value':6}
//     });
//     MC.save(function(err){
//       if(err){
//         res.status(500);
//         next();
//         return;
//       }else{
//         newMessage.save(function(err){
//           if(err){
//             res.status(500);
//             next();
//             return;
//           }else{
//             return res.send({'result':1,'msg':'发送站内信成功!'});
//           }
//         });
//       }
//     });
//   }else{
//     res.status(403);
//     next('forbidden');
//     return;
//   }
// }
//这些以后站内信分类时会用到的
/*
exports.renderPrivate = function(req,res){
  if(req.role !=='GUESTHR' && req.role !=='GUEST' && req.role !=='GUESTLEADER'){
    res.render('message/private');
  }else{
    res.status(403);
    next('forbidden');
    return;
  }
}
exports.renderTeam = function(req,res){
  if(req.role !=='GUESTHR' && req.role !=='GUEST' && req.role !=='GUESTLEADER'){
    res.render('message/team');
  }else{
    res.status(403);
    next('forbidden');
    return;
  }
}
exports.renderCompany = function(req,res){
  if(req.role !=='GUESTHR' && req.role !=='GUEST' && req.role !=='GUESTLEADER'){
    res.render('message/company');
  }else{
    res.status(403);
    next('forbidden');
    return;
  }
}
exports.renderSystem = function(req,res){
  if(req.role !=='GUESTHR' && req.role !=='GUEST' && req.role !=='GUESTLEADER'){
    res.render('message/system');
  }else{
    res.status(403);
    next('forbidden');
    return;
  }
}
*/
