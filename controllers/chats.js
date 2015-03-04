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
    tools = require('../tools/tools.js');

var shieldTip = "该评论已经被系统屏蔽";

var updateUserChatroom = function(chatroomId, user, reqUserId, callback) {
  if(user._id.toString() !== reqUserId.toString()) {
    var index = tools.arrayObjectIndexOf(user.chatrooms, chatroomId, '_id');
    if(index>-1) {
      user.chatrooms[index].unread++;
      user.save(function(err) {
        if(err) log(err);
        callback();
      });
    }else{
      callback();
    }
  }else {
    callback();
  }
};
module.exports = function (app) {

  return {
    canPublishChat: function (req, res, next) {
      if(!req.body.chatroomId) {
        return res.status(422).send({msg:'参数不合法'});
      }
      //如果是这个队伍的人则能发
      var index = tools.arrayObjectIndexOf(req.user.chatrooms, req.body.chatroomId, '_id');
      if(index===-1) {
        return res.status(403).send({ msg: '权限错误'});
      }else {
        next();
      }
    },
    uploadPhotoForChat: function (req, res, next) {
      if (req.headers['content-type'].indexOf('multipart/form-data') === -1) {
        next();
        return;
      }

      var imgSize;
      var randomId;
      uploader.uploadImg(req, {
        fieldName: 'photo',
        targetDir: '/public/img/photo_album',
        subDir: req.user.getCid().toString(),
        saveOrigin: true,
        getFields: function (fields) {
          if(fields.randomId) {
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
          oriCallback(path.join('/chat_ori_img', dateDirName), now.valueOf() ,function(err, ori_name) {
            if(err) {
              log(err);
            }else {
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
      var chat = new Chat({
        chatroom_id: req.body.chatroomId,
        content: req.body.content,
        poster: req.user._id,
        photos: [req.photo]
      });
      chat.save(function (err) {
        if(err) {
          log(err)
          return res.status(500).send({msg: '聊天保存失败'});
        }else {
          if(req.photo) chat.photos[0].ori_uri = null; //对外隐藏此属性
          res.status(200).send({'chat': chat});
          //找出相关人员
          User.find({'cid': req.user.cid, 'chatrooms':{'$elemMatch': {'_id':chat.chatroom_id}}}, {'chatrooms':1}, function(err, users) {
            if(err) {
              log(err);
            }
            else {
              //socket推送
              var userIds = [];
              var usersLength = users.length;
              for(var i=0; i<usersLength; i++) {
                userIds.push(users[i]._id);
              }
              socketClient.pushChat(chat.chatroom_id, chat, userIds);
              //users更新
              async.map(users, function(user, callback) {
                updateUserChatroom(chat.chatroom_id, user, req.user._id, function() {
                  callback();
                })
              }, function(err, results) {
                if(err) log(err);
                return;
              })
            }
          })
        }
      })
    },

    getChats: function (req, res, next) {

      if (req.user.provider !== 'user') {
        res.status(403).send({ msg: '抱歉，您没有权限' });
        return;
      } else {
        var isInChatRoomList = false;
        for (var i = 0; i < req.user.chatrooms.length; i++) {
          if (req.query.chatroom === req.users.chatrooms[i]._id.toString()) {
            isInChatRoomList = true;
            break;
          }
        }
        if (!isInChatRoomList) {
          res.status(403).send({ msg: '抱歉，您没有权限' });
          return;
        }
      }

      var pageSize = 20;
      var queryOptions = {
        chatroom_id: req.query.chatroom
      };
      if (req.query.nextDate) {
        queryOptions.create_date = {
          $gt: new Date(req.query.nextDate)
        };
      }
      if (req.query.nextId) {
        queryOptions._id = {
          $lte: req.query.nextId
        }
      }

      Chat.find(queryOptions, {
        'photos.ori_uri': 0
      })
        .sort('-create_date -_id')
        .limit(pageSize + 1)
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

    getChatRooms: function (req, res, next) {

      var role = auth.getRole(req.user, {
        companies: [req.user.getCid()]
      });
      var allow = auth.auth(role, ['getChatRooms']);
      if (!allow.getChatRooms) {
        res.status(403).send({ msg: '抱歉，您没有权限' });
        return;
      }

      // 讨论组列表其实就是用户的小队列表加上一个公司的讨论组，如果用户不是队长，则没有该讨论组
      var chatRoomIds = [];
      var chatRoomList = [];
      if (req.user.team) {
        var teams = req.user.team.filter(function (team) {
          return (team.entity_type !== 'virtual');
        });

        chatRoomIds = teams.map(function (team) {
          return team._id;
        });

        chatRoomList = teams.map(function (team) {
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
        chatRoomIds.push(req.user.getCid());
        chatRoomList.push({
          kind: 'company',
          _id: req.user.cid,
          name: req.user.company_official_name
        });
      }

      Chat.aggregate()
        .match({
          chatroom_id: chatRoomIds,
          status: 'active'
        })
        .sort('-create_date')
        .group({
          _id: '$chatroom_id',
          docs: {
            $first: '$$ROOT'
          }
        })
        .exec()
        .then(function (results) {
          var posterIdList = [];

          chatRoomList.forEach(function (chatRoom) {
            // 从查询结果中查找该讨论组匹配的最新讨论
            var latestChat;
            for (var i = 0; i < results.length; i++) {
              if (chatRoom._id.toString() === results[i]._id.toString()) {
                latestChat = results[i].docs[0];
                break;
              }
            }

            posterIdList.push(latestChat.poster);

            chatRoom.latestChat = {
              _id: latestChat._id,
              content: latestChat.content,
              create_date: latestChat.create_date,
              poster: latestChat.poster,
              photos: latestChat.photos ? latestChat.photos.map(function (photo) {
                return {
                  uri: photo.uri,
                  width: photo.width,
                  height: photo.height
                };
              }) : null
            };
          });

          // 查询poster
          queryPosters(posterIdList, chatRoomList);
        })
        .then(null, function (err) {
          next(err);
        });

      function queryPosters(posterIdList, chatRoomList) {
        User.find({
          _id: posterIdList
        }, {
          _id: 1,
          cid: 1,
          nickname: 1,
          photo: 1
        })
          .exec()
          .then(function (users) {
            // 填充chatRoomList的poster，原先为id，现将其替换为含用户昵称头像的对象
            chatRoomList.forEach(function (chatRoom) {
              for (var i = 0; i < users.length; i++) {
                if (chatRoom.poster.toString() === users[i]._id.toString()) {
                  chatRoom.poster = users[i];
                  break;
                }
              }
            });
            res.send({ chatRoomList: chatRoomList });
          })
          .then(null, function (err) {
            next(err);
          });
      }

    }
  };

};