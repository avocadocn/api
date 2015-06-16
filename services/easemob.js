'use strict';

// var https = require('https');
var request = require('request');
var querystring = require('querystring');
var log = require('./error_log.js');
var token = '';
var clientId = '';
var clientSecret = '';
var orgName = '';
var appName = '';
var mongoose = require('mongoose'),
    Config = mongoose.model('Config');
// var http_request = function (data, path, method, callback,hasReSend) {
//   data = data || {};
//   method = method || 'GET';

//   var postData = JSON.stringify(data);
//   var options = {
//     host: 'a1.easemob.com',
//     path: '/'+orgName+'/'+appName + path,
//     method: method,
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': 'Bearer ' + token
//     }
//   };
//   var req = https.request(options, function (res) {
//     var chunks = [];
//     var size = 0;
//     res.setEncoding('utf8');
//     // console.log(path,res.statusCode);
//     if(!hasReSend) {
//       if(res.statusCode===401) {
//         get_token(function () {
//           http_request(data, path, method, callback, true);
//         });
//         return;
//       }
//       else if(res.statusCode===503){
//         http_request(data, path, method, callback, true);
//         return;
//       }
//     }
//     res.on('data', function (chunk) {
//       chunks.push(chunk);
//       size += chunk.length;
//     });
//     res.on('end', function () {
//       var data = JSON.parse(Buffer.concat(chunks, size).toString());
//       if(data.error){
//         console.log('error' + data.error);
//       }
//       if (callback)
//         callback(data.error,data);
//     });
//   });

//   req.on('error', function (e) {
//     console.log('problem with request: ' + e.message);
//     if (callback)
//       callback(e.message);
//   });

//   // write data to request body
//   req.write(postData);
//   req.end();
// };
var http_request = function (data, path, method, callback,hasReSend) {
  data = data || {};
  method = method || 'GET';

  var postData = JSON.stringify(data);
  var options = {
    uri:  'https://a1.easemob.com/'+orgName+'/'+appName + path,
    method: method,
    json:true,
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };
  if(data){
    options.body = data;
  }
  request(options, function (error, response, body) {
    if(error){
      console.log('error' + error);
      if (callback)
        callback(error);
    }
    else{
      // console.log(error,response.statusCode,body);
      if(!hasReSend) {
        if(response.statusCode===401) {
          get_token(function () {
            http_request(data, path, method, callback, true);
          });
          return;
        }
        else if(response.statusCode===503){
          http_request(data, path, method, callback, true);
          return;
        }
      }
      if (callback)
        callback(error, body);
    }
    
  });
};
//获取环信appkey
var get_key = function (callback) {
  Config.findOne({
    name: 'admin'
  }).exec()
    .then(function (config) {
      if (!config) {
        callback(new Error('not found config'));
        return;
      }
      clientId = config.easemob.client_id;
      clientSecret = config.easemob.client_secret;
      orgName = config.easemob.org_name;
      appName = config.easemob.app_name;
      callback(null, config);
    })
    .then(null, function (err) {
      callback(err);
    });
};
//获取token
var get_token = function (callback) {
  var data = {grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret};
  http_request(data, '/token', 'POST', function (error,data) {
    if(!error){
      token = data.access_token;
      log(data);
      if (callback)
        callback();
    }
    else{
      log(error)
    }
    
  }); 
};
//模块初始化调用
get_key(function(error){
  if(!error){
    get_token();
  }
  else{
    console.error(error);
  }
});


var UserService = {};

/**
 * 注册用户
 * @param  {Object/Array}   data     对象或者数组{"username":"用户名","password":"密码"[, "nickname":"昵称值"]}
 * @param  {Function} callback 回调函数
 */
UserService.create = function (data, callback) {
  http_request(data, '/users', 'POST', callback);
};
/**
 * 获取多个用户
 * @param  {Object}   params     参数{limit=20&cursor=LTU2ODc0MzQzOnNmdTlxdF9LRWVPaVFvMWlBZmc4S3c}
 * @param  {Function} callback 回调函数
 */
UserService.get = function (params, callback) {
  var _params = '';
  if(params){
    _params = '?'+querystring.stringify(params);
  }
  http_request(null, '/users'+_params, 'GET', callback);
};
/**
 * 获取单个用户
 * @param  {String}   username     
 * @param  {Function} callback 回调函数
 */
UserService.getOne = function (username, callback) {
  http_request(null, '/users/'+username, 'GET', callback);
};
/**
 * 删除用户[批量]
 * @param  {Object}   params     参数{limit=20}
 * @param  {Function} callback 回调函数
 */
UserService.delete = function (params, callback) {
  var _params = '';
  if(params){
    _params = '?'+querystring.stringify(params);
  }
  http_request(null, '/users'+_params, 'DELETE', callback);
};
/**
 * 删除单个用户
 * @param  {String}   username     
 * @param  {Function} callback 回调函数
 */
UserService.deleteOne = function (username, callback) {
  http_request(null, '/users/'+username, 'DELETE', callback);
};
/**
 * 重置用户密码
 * @param  {String}   username     用户名
 * @param  {String}  password     密码
 * @param  {Function} callback 回调函数
 */
UserService.resetPsw = function (username, password,callback) {
  var data = {"newpassword": paassword};
  http_request(data, '/users/'+username+'/password', 'PUT', callback);
};
/**
 * 修改用户昵称
 * @param  {String}   username     用户名
 * @param  {String}   nickname     昵称
 * @param  {Function} callback 回调函数
 */
UserService.changeNickname = function (username, nickname, callback) {
  var data = {"nickname": nickname};
  http_request(data, '/users/'+username, 'PUT', callback);
};
/**
 * 给用户添加好友
 * @param  {String}   owner_username     用户名
 * @param  {String}   friend_username    被添加的用户名
 * @param  {Function} callback 回调函数
 */
UserService.addFriend = function (owner_username, friend_username, callback) {
  http_request(null, '/users/'+owner_username+'/contacts/users/'+friend_username, 'POST', callback);
};
/**
 * 解除用户的好友关系
 * @param  {String}   owner_username     用户名
 * @param  {String}   friend_username    被移除的用户名
 * @param  {Function} callback 回调函数
 */
UserService.deleteFriend = function (owner_username, friend_username, callback) {
  http_request(null, '/users/'+owner_username+'/contacts/users/'+friend_username, 'DELETE', callback);
};
/**
 * 查看用户的好友关系
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.getFriend = function (username, callback) {
  http_request(null, '/users/'+username+'/contacts/users', 'GET', callback);
};
/**
 * 查看用户的黑名单
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.getBlocks = function (username, callback) {
  http_request(null, '/users/'+username+'/blocks/users', 'GET', callback);
};
/**
 * 用户黑名单加人
 * @param  {String}   username     用户名
 * @param  {Array}   list     需要添加到黑名单的用户名
 * @param  {Function} callback 回调函数
 */
UserService.addBlocks = function (username, list, callback) {
  var data ={"usernames":list};
  http_request(data, '/users/'+username+'/blocks/users', 'POST', callback);
};
/**
 * 用户黑名单减人
 * @param  {String}   username     用户名
 * @param  {String}   blocked_username     需要从黑名单减去的用户名
 * @param  {Function} callback 回调函数
 */
UserService.deleteBlocks = function (username, blocked_username, callback) {
  http_request(null, '/users/'+username+'/blocks/users/'+blocked_username, 'DELETE', callback);
};
/**
 * 查看用户在线状态
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.getStatus = function (username, callback) {
  http_request(nulol, '/users/'+username+'/status', 'GET', callback);
};
/**
 * 查询离线消息数
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.offlineMsgCount = function (username, callback) {
  http_request(null, '/users/'+username+'/offline_msg_count', 'GET', callback);
};
/**
 * 查询某条离线消息状态
 * @param  {String}   username     用户名
 * @param  {String}   msg_id     消息id
 * @param  {Function} callback 回调函数
 */
UserService.offlineMsgStatus = function (username, msg_id, callback) {
  http_request(null, '/users/'+username+'/offline_msg_count/'+msg_id, 'GET', callback);
};
/**
 * 用户账号禁用
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.deactivate = function (username, callback) {
  http_request(null, '/users/'+username+'/deactivate', 'POST', callback);
};
/**
 * 用户账号解禁
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.activate = function (username, callback) {
  http_request(null, '/users/'+username+'/activate', 'POST', callback);
};
/**
 * 强制用户下线
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.disconnect = function (username, callback) {
  http_request(null, '/users/'+username+'/disconnect', 'POST', callback);
};
/**
 * 群组减人
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
UserService.joinedGroups = function (username, callback) {
  http_request(null, '/users/'+username +'/joined_chatgroups', 'GET', callback);
};
var GroupService ={};
/**
 * 获取app中的群组
 * @param  {Array}   groups     群组id，为null时返回所有的群组
 * @param  {Function} callback 回调函数
 */
GroupService.get = function (groups, callback) {
  var _groups ='';
  if(groups){
    _groups = '/'+groups.split(",");
  }
  http_request(null, '/chatgroups'+_groups, 'GET', callback);
};
/**
 * 新建一个群组
 * @param  {Object}   group     群组内容
                    {
                      "groupname":"testrestgrp12", //群组名称, 此属性为必须的
                      "desc":"server create group", //群组描述, 此属性为必须的
                      "public":true, //是否是公开群, 此属性为必须的,为false时为私有群
                      "maxusers":300, //群组成员最大数(包括群主), 值为数值类型,默认值200,此属性为可选的
                      "approval":true, //加入公开群是否需要批准, 默认值是false（加群不需要群主批准）, 此属性为可选的,只作用于公开群
                      "owner":"jma1", //群组的管理员, 此属性为必须的
                      "members":["jma2","jma3"] //群组成员,此属性为可选的,但是如果加了此项,数组元素至少一个（注：群主jma1不需要写入到members里面）
                    }
 * @param  {Function} callback 回调函数
 */
GroupService.add = function (group, callback) {
  http_request(group, '/chatgroups', 'POST', callback);
};

/**
 * 修改群组信息
 * @param  {String}   group_id     群组id
 * @param  {Object}   group     群组内容
                    {
                      "groupname":"testrestgrp12", //群组名称
                      "description":"update groupinfo", //群组描述
                      "maxusers":300, //群组成员最大数(包括群主), 值为数值类型
                    }
 * @param  {Function} callback 回调函数
 */
GroupService.edit = function (group_id, group, callback) {
  http_request(group, '/chatgroups/'+group_id, 'PUT', callback);
};
/**
 * 删除群组
 * @param  {String}   group_id     群组id
 * @param  {Function} callback 回调函数
 */
GroupService.delete = function (group_id, callback) {
  http_request(null, '/chatgroups/'+group_id, 'DELETE', callback);
};

/**
 * 获取群组中的所有成员
 * @param  {String}   group_id     群组id
 * @param  {Function} callback 回调函数
 */
GroupService.getUsers = function (group_id, callback) {
  http_request(null, '/chatgroups/'+group_id+'/users', 'GET', callback);
};

/**
 * 群组加人[单个]
 * @param  {String}   group_id     群组id
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
GroupService.addUser = function (group_id, username, callback) {
  http_request(null, '/chatgroups/'+group_id+'/users/'+username, 'POST', callback);
};

/**
 * 群组加人[批量]
 * @param  {String}   group_id     群组id
 * @param  {Array}   usernames     用户列表
 * @param  {Function} callback 回调函数
 */
GroupService.addUsers = function (group_id, usernames, callback) {
  var data = {"usernames":usernames};
  http_request(data, '/chatgroups/'+group_id+'/users', 'POST', callback);
};
/**
 * 群组减人
 * @param  {String}   group_id     群组id
 * @param  {String}   username     用户名
 * @param  {Function} callback 回调函数
 */
GroupService.deleteUser = function (group_id, username, callback) {
  http_request(null, '/chatgroups/'+group_id+'/users/'+username, 'DELETE', callback);
};

var ChatService = {};
/**
 * 获取聊天记录
 * @param  {[type]} params [description]
 * ql=select * where timestamp>1403164734226  时间戳条件 >或<
 * limit=20 限制数目
 * cursor=MTYxOTcyOTYyNDpnR2tBQVFNQWdHa0 光标
 * @return {[type]}        [description]
 */
ChatService.getMessages = function (params) {
  var _params = '';
  if(params){
    _params = '?'+querystring.stringify(params);
  }
  http_request(null, '/chatmessages/', 'GET', callback);
}
exports.user = UserService;
exports.group = GroupService;

exports.chat = ChatService;


