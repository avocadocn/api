'use strict';

var path = require('path'),
  fs = require('fs');
var mongoose = require('mongoose');
var User = mongoose.model('User'),
  Chat = mongoose.model('Chat'),
  CompanyGroup = mongoose.model('CompanyGroup');

var async = require('async');
var auth = require('../services/auth.js'),
  log = require('../services/error_log.js'),
  socketClient = require('../services/socketClient'),
  uploader = require('../services/uploader.js'),
  tools = require('../tools/tools.js'),
  chatsBusiness = require('../business/chats');
var shieldTip = "该评论已经被系统屏蔽";
module.exports = function (app) {

  return {
    canPublishChat: function (req, res, next) {
      if (!req.params.chatroomId) {
        return res.status(422).send({msg: '参数不合法'});
      }
      if (req.user.provider === 'company') {
        return res.status(403).send({msg: '权限错误'});
      }
      //如果是这个队伍的人则能发
      var index = tools.arrayObjectIndexOf(req.user.chatrooms, req.params.chatroomId, '_id');
      if (index === -1) {
        return res.status(403).send({msg: '权限错误'});
      }
      else {
        next();
      }
    },
    uploadPhotoForChat: function (req, res, next) {
      if (!req.headers['content-type'] || req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }
      var imgSize;
      var randomId;
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/chats',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
        getFields: function (fields) {
          if (fields.randomId) {
            randomId = fields.randomId[0];
            req.randomId = randomId;
          }
        },
        getSize: function (size) {
          imgSize = size;
        },
        success: function (url, oriName, oriCallback) {
          var now = new Date();
          var dateDirName = now.getFullYear().toString() + '-' + (now.getMonth() + 1);
          oriCallback(path.join('/chat_ori_img', dateDirName), now.valueOf(), function (err, ori_name) {
            if (err) {
              log(err);
            }
            else {
              req.photo = {
                uri: path.join('/img/chats', url),
                width: imgSize.width,
                height: imgSize.height,
                ori_uri: path.join('/chat_ori_img', dateDirName) + '/' + ori_name
              };
            }
            next();
          })
        },
        error: function (err) {
          log(err);
          res.sendStatus(500);
        }
      });

    },
    createChat: function (req, res) {
      if (!req.photo && !req.body.content) {
        return res.status(422).send({msg: '未填写内容'});
      }
      var param ={
        chatroomId: req.params.chatroomId,
        content: req.body.content,
        chatType: req.body.chatType,
        photo: req.photo,
        recommendTeamId:req.body.recommendTeamId,
        randomId: req.body.randomId  || req.randomId,
        user: req.user
      }
      chatsBusiness.createChat(param,function (err, chat) {
        if(err) {
          log(err)
          return res.status(500).send({msg: '聊天保存失败'});
        }
        else{
          res.status(200).send({'chat': chat});
        }
      })
    },

    getChats: function (req, res, next) {

      if (req.user.provider !== 'user') {
        res.status(403).send({msg: '抱歉，您没有权限'});
        return;
      }
      else {
        var index = tools.arrayObjectIndexOf(req.user.chatrooms, req.query.chatroom, '_id');
        if (index===-1) {
          res.status(403).send({msg: '抱歉，您没有权限'});
          return;
        }
      }

      var pageSize = 20;
      var queryOptions = {
        chatroom_id: req.query.chatroom,
        status: 'active',
        create_date: {'$gt':req.user.chatrooms[index].join_time}
      };//只取加入之后的
      if (req.query.nextDate) {
        // var timeCompare = new Date(req.query.nextDate) > req.user.chatrooms[index].join_time ;
        queryOptions.create_date = {
          '$lt': new Date(req.query.nextDate),
          '$gt': req.user.chatrooms[index].join_time
        };
      }
      if (req.query.nextId) {
        queryOptions._id = {
          $lte: req.query.nextId
        }
      }
      //取某时间之后的所有最新评论
      if(req.query.preDate) {
        queryOptions.create_date = {
          $gt: req.query.preDate
        };
        pageSize = 1000;
      }

      Chat.find(queryOptions, {
        'photos.ori_uri': 0
      })
        .sort('-create_date -_id')
        .limit(pageSize + 1)
        .populate([{'path':'poster', 'select':{nickname:1, logo:1, photo:1}},{'path':'competition_message'}])
        .exec()
        .then(function (chats) {
          var resData = {
            hasNextPage: false
          };
          if (chats.length > pageSize) {
            resData.hasNextPage = true;
            resData.nextDate = chats[pageSize].create_date;
            resData.nextId = chats[pageSize].id;
          }
          resData.chats = chats.slice(0, pageSize);
          res.send(resData);
        })
        .then(null, function (err) {
          next(err);
        });
    },

    deleteChat: function (req, res, next) {
      Chat.findOne({
        _id: req.params.chatId,
        status: 'active'
      }).exec()
        .then(function (chat) {
          if (!chat) {
            res.status(404).send({msg: '找不到该消息'});
            return;
          }

          if (req.user.id !== chat.poster.toString()) {
            res.status(403).send({msg: '抱歉，您没有权限'});
            return;
          }

          chat.status = 'delete';
          chat.save(function (err) {
            if (err) {
              next(err);
            }
            else {
              res.send({msg: '删除成功'});
            }
          });
        })
        .then(null, function (err) {
          next(err);
        });
    },

    readChatRoomChats: function (req, res, next) {
      clearUserChatRoomUnReadCount(req.user, req.body.chatRoomIds, function (err) {
        if (err) {
          next(err);
        }
        else {
          res.send({msg: '清零成功'});
        }
      });
    },
    getChatroomsUnread: function (req, res, next) {
      var role = auth.getRole(req.user, {
        companies: [req.user.getCid()]
      });
      var allow = auth.auth(role, ['getChatRooms']);
      if (!allow.getChatRooms) {
        res.status(403).send({msg: '抱歉，您没有权限'});
        return;
      }
      async.map(req.user.chatrooms, function(chatroom, callback) {
        Chat.find({chatroom_id: chatroom._id, create_date: {'$gt':chatroom.read_time}},{'_id':1},function(err, chats) {
          if(err) {
            callback(err);
          }else {
            callback(null, {_id: chatroom._id, unread: chats.length});
          }
        });
      }, function(err, results) {
        if(err) {
          next(err);
        }else {
          res.status(200).send({chatrooms: results});
        }
      });
    },

    getChatRooms: function (req, res, next) {

      var role = auth.getRole(req.user, {
        companies: [req.user.getCid()]
      });
      var allow = auth.auth(role, ['getChatRooms']);
      if (!allow.getChatRooms) {
        res.status(403).send({msg: '抱歉，您没有权限'});
        return;
      }

      // 讨论组列表其实就是用户的小队列表加上一个公司的讨论组，如果用户不是队长，则没有该讨论组
      var chatroomIds = [];
      var chatroomList = [];
      if (req.user.team) {
        var teams = req.user.team.filter(function (team) {
          return (team.entity_type !== 'virtual');
        });

        chatroomIds = teams.map(function (team) {
          return team._id;
        });

        chatroomList = teams.map(function (team) {
          return {
            kind: 'team',
            _id: team._id,
            name: team.name,
            logo: team.logo
          };
        });
      }
      // 只有是队长才可以参与公司管理讨论组
      if (req.user.role === 'LEADER') {
        chatroomIds.push(req.user.getCid());
        chatroomList.push({
          kind: 'company',
          _id: req.user.cid,
          name: req.user.company_official_name
        });
      }
      if(!chatroomList.length) {
        return res.send({chatroomList: chatroomList});
      }
      Chat.aggregate()
        .match({
          chatroom_id: {$in: chatroomIds},
          status: 'active'
        })
        .sort('-create_date')
        .group({
          _id: '$chatroom_id',
          latestChat: {
            $first: {
              chatroom_id: '$chatroom_id',
              content: '$content',
              create_date: '$create_date',
              poster: '$poster',
              photos: '$photos'
            }
          }
        })
        .sort('-latestChat.create_date')
        .exec()
        .then(function (results) {
          //---为了排序写两步
          //先把results里有的放到列表里
          var posterIdList = [];
          var resultChatroomList = [];
          var resultsLength = results.length;
          for (var i=0; i<results.length; i++) {
            var index = tools.arrayObjectIndexOf(chatroomList, results[i]._id, '_id');
            if(index>-1) {
              var chatroom = chatroomList[index];
              chatroom.latestChat = results[i].latestChat;
              resultChatroomList.push(chatroom);
              posterIdList.push(chatroom.latestChat.poster);
            }
          }
          //再把results里没有的放进去
          var chatroomListLength = chatroomList.length;
          for (var i=0; i<chatroomListLength; i++) {
            var index = tools.arrayObjectIndexOf(results, chatroomList[i]._id, '_id');
            if(index===-1) {
              resultChatroomList.push(chatroomList[i]);
            }
          }

          // 查询poster
          queryPosters(posterIdList, resultChatroomList);
        })
        .then(null, function (err) {
          next(err);
        });

      function queryPosters(posterIdList, chatroomList) {
        User.find({
          _id: {$in: posterIdList}
        }, {
          _id: 1,
          cid: 1,
          nickname: 1,
          photo: 1
        })
          .exec()
          .then(function (users) {
            // 填充chatroomList的poster，原先为id，现将其替换为含用户昵称头像的对象
            chatroomList.forEach(function (chatroom) {
              for (var i = 0; i < users.length; i++) {
                if (chatroom.latestChat && chatroom.latestChat.poster.toString() === users[i]._id.toString()) {
                  chatroom.latestChat.poster = users[i];
                  break;
                }
              }
            });
            res.send({chatroomList: chatroomList});
          })
          .then(null, function (err) {
            next(err);
          });
      }

    }
  };

};

/**
 * 将用户的chatroom未读标记清零->修改读过的时间
 * @param {Object} user mongoose.model('User')
 * @param {ObjectId|String|Array} roomIds chatRoomId，可以是单个，或是数组
 * @param {Function} callback 执行后的回调function (err) {}
 */
function clearUserChatRoomUnReadCount(user, roomIds, callback) {
  if (!user.chatrooms) {
    callback(new Error('该用户没有chatrooms'));
  }
  else {
    if (!roomIds instanceof Array) {
      roomIds = [roomIds];
    }
    for (var i = 0, ilen = roomIds.length; i < ilen; i++) {
      for (var j = 0, jlen = user.chatrooms.length; j < jlen; j++) {
        if (roomIds[i].toString() === user.chatrooms[j]._id.toString()) {
          user.chatrooms[j].read_time = new Date();
          break;
        }
      }
    }
    user.save(function (err) {
      callback && callback(err);
    });
  }
}